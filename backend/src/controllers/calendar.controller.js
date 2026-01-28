import * as companyEventsService from '../services/companyEvents.service.js';
import * as calendarService from '../services/calendar.service.js';

// get all calendar events
export const getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, types } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const events = await calendarService.getCalendarEvents(start, end, types, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Calendar events retrieved successfully',
      data: events
    });
  } catch (error) {
    next(error);
  }
};

// get information for a specific event
export const getEventDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await companyEventsService.getCompanyEventById(id);

    res.status(200).json({
      success: true,
      message: 'Event details retrieved successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// create new company event
export const createCompanyEvent = async (req, res, next) => {
  try {
    const eventData = req.body;
    const userId = req.user.id;

    const newEvent = await companyEventsService.createCompanyEvent(eventData, userId);

    res.status(201).json({
      success: true,
      message: 'Company event created successfully',
      data: newEvent
    });
  } catch (error) {
    next(error);
  }
};

// update existing company event
export const updateCompanyEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    const userId = req.user.id;

    const updatedEvent = await companyEventsService.updateCompanyEvent(id, eventData, userId);

    res.status(200).json({
      success: true,
      message: 'Company event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    next(error);
  }
};

// delete a company event
export const deleteCompanyEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedEvent = await companyEventsService.deleteCompanyEvent(id, userId);

    res.status(200).json({
      success: true,
      message: 'Company event deleted successfully',
      data: deletedEvent
    });
  } catch (error) {
    next(error);
  }
};

// get leave request details by id
export const getLeaveDetails = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const leaveDetails = await calendarService.getLeaveDetailsById(leaveId, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Leave details retrieved successfully',
      data: leaveDetails
    });
  } catch (error) {
    next(error);
  }
};
