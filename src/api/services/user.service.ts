import { genSaltSync, hashSync } from 'bcrypt';
import createHttpError from 'http-errors';
import { IUser } from '../../types/user.type';
import StudentModel from '../models/student.model';
import UserModel from '../models/user.model';
import { UserRoleEnum } from './../../types/user.type';
import removeVietnameseTones from '../../helpers/vnFullTextSearch';

// Add multi parents users
const checkIsValidParentUser = async ({ email, phone }: { email: string; phone: string }) => {
	try {
		const [existedUser, childrenOfExistedUser] = await Promise.all([
			UserModel.exists({ email: email, phone: phone }),
			StudentModel.exists({ parentsPhoneNumber: phone })
		]);
		return {
			isUserExisted: !!existedUser,
			hasChildren: !!childrenOfExistedUser
		};
	} catch (error) {
		throw error;
	}
};

export const createUser = async ({
	payload,
	multi
}: {
	payload: Partial<IUser> & Array<Partial<IUser>>;
	multi: boolean;
}) => {
	try {
		if (multi && Array.isArray(payload) && payload.every((user) => user.role === UserRoleEnum.PARENTS)) {
			payload.forEach((user) => {
				checkIsValidParentUser({
					email: user.email ?? '',
					phone: user.phone ?? ''
				}).then((result) => {
					if (result.isUserExisted) throw createHttpError.Conflict('Parent account already existed!');
					if (!result.hasChildren) throw createHttpError.Conflict(`No student has this parent's phone number!`);
				});
			});
			return await UserModel.insertMany(payload);
		}
		// Add a new teacher user
		if (payload.role === UserRoleEnum.TEACHER) {
			const existedTeacher = await UserModel.findOne({
				email: payload.email,
				role: UserRoleEnum.TEACHER
			});
			if (existedTeacher) {
				throw createHttpError.BadRequest('Teacher account already existed!');
			}

			return await new UserModel(payload).save();
		}
	} catch (error) {
		throw error;
	}
};

// Users update them self account's info
export const updateUserInfo = async (authId: string, payload: Partial<IUser>) => {
	try {
		return await UserModel.findOneAndUpdate({ _id: authId }, payload, {
			new: true
		});
	} catch (error) {
		throw error;
	}
};

// Headmaster update teacher user's info
export const updateTeacherInfo = async (teacherId: string, payload: Partial<IUser>) => {
	try {
		return await UserModel.findOneAndUpdate({ _id: teacherId, role: UserRoleEnum.TEACHER }, payload, { new: true });
	} catch (error) {
		throw error;
	}
};

export const getUserDetails = async (userId: string) => {
	try {
		return await UserModel.findOne({ _id: userId }).lean();
	} catch (error) {
		throw error;
	}
};

export const changePassword = async (userId: string, newPassword: string) => {
	try {
		const encryptedNewPassword = hashSync(newPassword, genSaltSync(+process.env.SALT_ROUND!));
		return await UserModel.findOneAndUpdate({ _id: userId }, { password: encryptedNewPassword }, { new: true });
	} catch (error) {
		throw error;
	}
};

export const getTeacherUsersByStatus = async (status?: string) => {
	try {
		switch (status) {
			case 'inactive':
				return await UserModel.find({
					role: UserRoleEnum.TEACHER,
					isVerified: false
				});

			// In working teacher
			case 'in_working':
				return await UserModel.find({
					role: UserRoleEnum.TEACHER,
					employmentStatus: true
				});

			// Inactivate user
			case 'quited':
				return await UserModel.findWithDeleted({
					role: UserRoleEnum.TEACHER,
					deleted: true,
					isVerified: true,
					employmentStatus: false
				});

			default:
				return await UserModel.findWithDeleted({
					role: UserRoleEnum.TEACHER
				});
		}
	} catch (error) {
		throw error;
	}
};

export const deactivateTeacherUser = async (userId: string) => {
	try {
		return await UserModel.findOneAndUpdate(
			{ _id: userId, role: UserRoleEnum.TEACHER },
			{ employmentStatus: false, deleted: true },
			{ new: true }
		).lean();
	} catch (error) {
		throw error;
	}
};

export const getParentsUserByClass = async (classId: string) => {
	try {
		const parents = await UserModel.find({ role: UserRoleEnum.PARENTS })
			.populate({
				path: 'children',
				select: 'fullName parentsPhoneNumber class',
				options: {
					id: false
				},
				match: {
					$and: [{ parentsPhoneNumber: { $exists: true } }, { class: classId }]
				},
				populate: { path: 'class', select: 'className' }
			})
			.select('_id displayName email phone gender dateOfBirth')
			.lean();

		return parents;
	} catch (error) {
		throw error;
	}
};

export const searchParents = async (searchTerm: string) => {
	try {
		// searchTerm = removeVietnameseTones(searchTerm);
		console.log(searchTerm);
		const pattern = new RegExp(`^${searchTerm}`, 'gi');
		return await UserModel.find({
			$or: [
				{ phone: pattern, role: UserRoleEnum.PARENTS },
				{
					displayName: removeVietnameseTones(searchTerm),
					role: UserRoleEnum.PARENTS
				},
				{ email: pattern, role: UserRoleEnum.PARENTS }
			]
		}).lean();
	} catch (error) {
		throw error;
	}
};
