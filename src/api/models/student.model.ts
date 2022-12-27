import mongoose from "mongoose";
import { Student } from "../interfaces/schemas.interface";

const studentSchema = new mongoose.Schema<Student>({
	_id: {
		type: mongoose.Types.ObjectId,
		default: new mongoose.Types.ObjectId(),
	},
	fullName: {
		type: String,
		require: true,
		trim: true,
	},
	gender: {
		type: Boolean,
		require: true,
	},
	dateOfBirth: {
		type: Date,
		require: true,
	},
	class: {
		type: mongoose.Types.ObjectId,
		ref: "Classes",
	},
	schoolYear: {
		type: mongoose.Types.ObjectId,
		ref: "SchoolYear",
	},
	parentPhoneNumber: {
		type: String,
		require: true,
	},
	attendance: [
		{
			date: {
				type: Date,
				default: new Date(),
			},
			isPresent: {
				type: Boolean,
				require: true,
			},
			hasPermision: Boolean,
			reason: String,
		},
	],
});
studentSchema.set("autoIndex", true);
// studentSchema.statics.resetAttandanceEveryMonth = function () {};

export default mongoose.model("Students", studentSchema);