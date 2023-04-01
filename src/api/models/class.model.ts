import mongoose, { Model, ObjectId } from 'mongoose';
import mongooseDelete, { SoftDeleteDocument, SoftDeleteModel } from 'mongoose-delete';

export interface Class extends Document {
	_id: ObjectId;
	grade: 1 | 2 | 3 | 4 | 5;
	className: string;
	headTeacher: ObjectId;
	students: Array<ObjectId>;
}

interface ClassDocument extends Omit<SoftDeleteDocument, '_id'>, Class {}

type ClassModel = Model<ClassDocument>

type SoftDeleteClassModel = SoftDeleteModel<ClassDocument, ClassModel>

const ClassSchema = new mongoose.Schema<ClassDocument>(
	{
		className: {
			type: String,
			require: true,
			trim: true,
			uppercase: true,
			unique: true,
		},
		grade: {
			type: Number,
			enum: [1, 2, 3, 4, 5],
			require: true,
		},
		headTeacher: {
			type: mongoose.Types.ObjectId,
			ref: 'Teachers',
			autopopulate: { select: '_id fullName phone email' },
		},
	},
	{
		collection: 'classes',
		timestamps: true,
	}
);

ClassSchema.plugin(mongooseDelete, { overrideMethods: ['find', 'findOne'], deletedAt: true });

ClassSchema.virtual('students', {
	localField: '_id',
	foreignField: 'class',
	ref: 'students',
});

const ClassModel: SoftDeleteClassModel = mongoose.model<ClassDocument, SoftDeleteClassModel>(
	'Classes',
	ClassSchema
);

export default ClassModel;
