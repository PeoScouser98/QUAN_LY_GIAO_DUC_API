import 'dotenv/config';
import { Request, Response } from 'express';
import createHttpError, { HttpError } from 'http-errors';
import jwt, { JsonWebTokenError, JwtPayload } from 'jsonwebtoken';
import { MongooseError } from 'mongoose';
import path from 'path';
import redisClient from '../../database/redis';
import formatPhoneNumber from '../../helpers/formatPhoneNumber';
import generateOtp from '../../helpers/otpGenerator';
import { AuthRedisKeyPrefix } from '../../types/redis.type';
import { IUser } from '../../types/user.type';
import '../auth/googlePassport';
import UserModel from '../models/user.model';
import sendSMS from '../services/sms.service';
import { changePassword } from '../services/user.service';
import appConfig from '../../configs/app.config';
import { getPermissionByRole } from '../services/permission.service';

export const signinWithGoogle = async (req: Request, res: Response) => {
	try {
		const user = req.user as Partial<IUser>;
		console.log(user);
		if (!user) {
			return res.redirect(appConfig.CLIENT_URL + '/signin');
		}
		// const userPermissions =await  getPermissionByRole(user.role!);
		const accessToken = jwt.sign({ payload: req.user }, process.env.ACCESS_TOKEN_SECRET!, {
			expiresIn: '1h',
		});

		const refreshToken = jwt.sign({ payload: req.user }, process.env.REFRESH_TOKEN_SECRET!, {
			expiresIn: '30d',
		});

		await Promise.all([
			redisClient.set(AuthRedisKeyPrefix.ACCESS_TOKEN + user._id, accessToken, {
				EX: 60 * 60, // 1 hour
			}),
			redisClient.set(AuthRedisKeyPrefix.REFRESH_TOKEN + user._id, refreshToken, {
				EX: 60 * 60 * 24 * 30, // 1 month
			}),
		]);

		res.cookie('access_token', accessToken, {
			maxAge: 60 * 60 * 1000 * 24 * 365, // 1 day
			httpOnly: true,
			// secure: false,
		});


		res.cookie('uid', user?._id?.toString().trim(), {
			maxAge: 60 * 60 * 1000 * 24 * 30, // 30 days
			httpOnly: true,
			// secure: false,
		});
    
		return res.redirect(appConfig.CLIENT_URL + '/signin/success');
	} catch (error) {
		return res.status((error as HttpError).statusCode || 500).json({
			message: (error as HttpError | MongooseError).message,
			statusCode: (error as HttpError).status || 500,
		});
	}
};

export const signinWithPhoneNumber = async (req: Request, res: Response) => {
	try {
		const user = req.user as Partial<IUser>;
		const accessToken = jwt.sign({ payload: user }, process.env.ACCESS_TOKEN_SECRET!, {
			expiresIn: '1h',
		});
		const refreshToken = jwt.sign({ payload: user }, process.env.REFRESH_TOKEN_SECRET!, {
			expiresIn: '30d',
		});

		await Promise.all([
			redisClient.set(AuthRedisKeyPrefix.ACCESS_TOKEN + user._id, accessToken, {
				EX: 60 * 60, // 1 hour
			}),
			redisClient.set(AuthRedisKeyPrefix.REFRESH_TOKEN + user._id, refreshToken, {
				EX: 60 * 60 * 24 * 30, // 1 month
			}),
		]);

		res.cookie('access_token', accessToken, {
			maxAge: 60 * 60 * 1000 * 24 * 365, // 1 day
			httpOnly: true,
			// secure: false,
		});  
		res.cookie('uid', user?._id?.toString().trim(), {
			maxAge: 60 * 60 * 1000 * 24 * 365, // 30 days
			httpOnly: true,
			// secure: false,
		});
    
		return res.status(200).json(req.user);
	} catch (error) {
		return res.status((error as HttpError).statusCode || 500).json({
			message: (error as HttpError | MongooseError | JsonWebTokenError).message,
			statusCode: (error as HttpError).status || 500,
		});
	}
};

export const getUser = async (req: Request, res: Response) => {
	try {
		if (!req.profile) {
			throw createHttpError.NotFound(`Failed to get user's info`);
		}

		return res.status(200).json(req.profile);
	} catch (error) {
		return res.status((error as HttpError).status || 500).json({
			message: (error as HttpError | MongooseError).message,
			statusCode: (error as HttpError).status,
		});
	}
};

export const refreshToken = async (req: Request, res: Response) => {
	try {
		const storedRefreshToken = await redisClient.get(
			AuthRedisKeyPrefix.REFRESH_TOKEN + req.cookies.uid
		);

		if (!storedRefreshToken) {
			throw createHttpError.BadRequest('Invalid refresh token!');
		}
		const decoded = jwt.verify(
			storedRefreshToken,
			process.env.REFRESH_TOKEN_SECRET!
		) as JwtPayload;
		if (!decoded) {
			throw createHttpError.Forbidden('Invalid');
		}
		const newAccessToken = jwt.sign(decoded, process.env.ACCESS_TOKEN_SECRET!, {
			expiresIn: '30m',
		});
		await redisClient.set(req.params.userId, newAccessToken);
		return res.status(200).json({
			refreshToken: newAccessToken,
			statusCode: 200,
			message: 'ok',
		});
	} catch (error) {
		return res.status((error as HttpError).statusCode || 500).json({
			message: (error as HttpError | MongooseError | JsonWebTokenError).message,
			statusCode: (error as HttpError).status || 500,
		});
	}
};

export const signout = async (req: Request, res: Response) => {
	try {
		const userRedisTokenKeys = {
			accessToken: AuthRedisKeyPrefix.ACCESS_TOKEN + req.profile._id,
			refreshToken: AuthRedisKeyPrefix.REFRESH_TOKEN + req.profile._id,
		};
		const accessToken = await redisClient.get(userRedisTokenKeys.accessToken);

		if (!accessToken)
			return res.status(400).json({
				message: 'Failed to revoke token',
				statusCode: 400,
			});
		// Delete user's access & refresh token in Redis
		await Promise.all([
			redisClient.del(userRedisTokenKeys.accessToken),
			redisClient.del(userRedisTokenKeys.refreshToken),
		]);
		// Reset all client's cookies
		req.logout((err) => {
			if (err) throw err;
		});
		res.clearCookie('access_token');
		res.clearCookie('uid');
		res.clearCookie('connect.sid', { path: '/' });

		return res.status(202).json({
			message: 'Signed out!',
			statusCode: 202,
		});
	} catch (error) {
		return res.status((error as HttpError).status || 500).json({
			message: 'Không thể đăng xuất',
			statusCode: (error as HttpError).status || 500,
		});
	}
};

export const verifyAccount = async (req: Request, res: Response) => {
	try {
		const token = req.query.token as string;
		if (!token) {
			throw createHttpError.Unauthorized('Access token must be provided!');
		}
		const { auth } = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as JwtPayload;
		const updateUserData =
			req.query.user_type === 'teacher'
				? { isVerified: true, employmentStatus: true }
				: { isVerified: true };
		await UserModel.findOneAndUpdate({ email: auth }, updateUserData, {
			new: true,
		});

		return res.sendFile(
			path.resolve(path.join(__dirname, '../../views/send-mail-response.html'))
		);
	} catch (error) {
		return res.status((error as HttpError).statusCode || 500).json({
			message: (error as HttpError | JsonWebTokenError | Error).message,
			statusCode: (error as HttpError).status,
		});
	}
};

export const sendOtp = async (req: Request, res: Response) => {
	try {
		const existedUser = await UserModel.findOne({ phone: req.body.phone });
		if (!existedUser) {
			throw createHttpError.NotFound(`User's phone number does not exist!`);
		}

		const otp = generateOtp();
		await redisClient.set(AuthRedisKeyPrefix.OTP_KEY + existedUser._id, otp, { EX: 60 * 60 });
		console.log('OTP is ', otp);
		const response = await sendSMS({
			to: formatPhoneNumber(req.body.phone),
			text: `Mã xác thực của bạn là ${otp}`,
		});
		if (!response) {
			throw createHttpError.InternalServerError('Failed to send sms!');
		}

		return res.status(200).json(response);
	} catch (error) {
		return res.status((error as HttpError).status || 500).json({
			message: (error as HttpError | Error | MongooseError).message,
			statusCode: (error as HttpError).status,
		});
	}
};

export const verifyUserByPhone = async (req: Request, res: Response) => {
	try {
		if (!req.body.verifyCode) {
			throw createHttpError.BadRequest('Verify code must be provided!');
		}
		const code = await redisClient.get(AuthRedisKeyPrefix.OTP_KEY + req.params.userId);
		if (!code) {
			throw createHttpError.Gone('Code is expired!');
		}
		if (req.body.verifyCode !== code) {
			return res.status(400).json({
				message: 'Incorrect verify code!',
				statusCode: 400,
			});
		}
		const accessToken = jwt.sign(
			{ payload: req.params.userId },
			process.env.ACCESS_TOKEN_SECRET!,
			{ expiresIn: '5m' }
		);
		res.cookie('access_token', accessToken, { maxAge: 60 * 1000 * 5 });
		await redisClient.del(AuthRedisKeyPrefix.OTP_KEY + req.params.userId);

		return res.status(200).json({
			message: 'Ok',
			statusCode: 200,
			data: {
				accessToken,
				isSuccess: true,
			},
		});
	} catch (error) {
		return res.status((error as HttpError).status || 500).json({
			message: (error as HttpError | Error | MongooseError).message,
			statusCode: (error as HttpError).status,
		});
	}
};

export const resetPassword = async (req: Request, res: Response) => {
	try {
		if (!req.cookies.access_token) {
			throw createHttpError.Unauthorized('');
		}

		const decoded = jwt.verify(
			req.cookies.access_token,
			process.env.ACCESS_TOKEN_SECRET!
		) as JwtPayload;
		await changePassword(decoded.payload, req.body.newPassword);
		return res.status(200).json({
			message: 'Ok',
			statusCode: 200,
		});
	} catch (error) {
		return res.status((error as HttpError).status || 500).json({
			message: (error as HttpError | Error | MongooseError).message,
			statusCode: (error as HttpError).status,
		});
	}
};
