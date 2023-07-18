import express from 'express'
import { checkAuthenticated, checkIsHeadmaster, checkIsTeacher } from '../middlewares/authGuard.middleware'
import * as TimeTableController from '../controllers/timeTable.controller'

const router = express.Router()

router.get('/time-table/teacher', checkAuthenticated, checkIsTeacher, TimeTableController.getTeacherTimetable)
router.get('/time-table/:classId', checkAuthenticated, TimeTableController.getTimeTableByClass)
router.put(
	'/time-table/:classId',
	// checkAuthenticated, checkIsHeadmaster,
	TimeTableController.saveTimeTable
)

export default router
