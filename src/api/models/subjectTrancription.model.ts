import mongoose from 'mongoose'
import mongooseAutoPopulate from 'mongoose-autopopulate'
import { ISubjectTranscriptDocument } from '../../types/subjectTranscription.type'

const SubjectTranscriptSchema = new mongoose.Schema<ISubjectTranscriptDocument>(
	{
		student: {
			type: mongoose.Types.ObjectId,
			required: true,
			ref: 'Students'
		},
		schoolYear: {
			type: mongoose.Types.ObjectId,
			ref: 'SchoolYears',
			autopopulate: { select: 'startAt endAt' },
			required: true
		},
		subject: {
			type: mongoose.Types.ObjectId,
			required: true,
			ref: 'Subjects',
			autopopulate: { select: 'subjectName' }
		},
		isPassed: {
			type: Boolean
		},
		firstSemester: {
			midtermTest: {
				type: Number,
				min: 0,
				max: 10
			},
			finalTest: {
				type: Number,
				min: 0,
				max: 10
			}
		},
		secondSemester: {
			midtermTest: {
				type: Number,
				min: 0,
				max: 10
			},
			finalTest: {
				type: Number,
				min: 0,
				max: 10
			}
		}
	},
	{
		collection: 'subject_transcriptions',
		timestamps: true,
		versionKey: false
		// minimize: true
	}
)

SubjectTranscriptSchema.plugin(mongooseAutoPopulate)

const SubjectTranscriptionModel = mongoose.model<ISubjectTranscriptDocument>(
	'SubjectTranscriptions',
	SubjectTranscriptSchema
)

export default SubjectTranscriptionModel
