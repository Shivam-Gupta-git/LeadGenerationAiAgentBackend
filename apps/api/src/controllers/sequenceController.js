import { Sequence } from '../models/Sequence.js';
import { executeSequenceStep } from '../services/email/sequenceDispatcher.js';

export const getSequences = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const sequences = await Sequence.find({ organizationId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sequences.length,
      data: sequences
    });
  } catch (error) {
    next(error);
  }
};

export const createSequence = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { name, description, campaignId, steps } = req.body;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name and at least one step in steps array are required'
      });
    }

    const sequence = await Sequence.create({
      organizationId,
      campaignId,
      name,
      description,
      steps
    });

    return res.status(201).json({
      success: true,
      message: 'Drip sequence created successfully',
      data: sequence
    });
  } catch (error) {
    next(error);
  }
};

export const updateSequence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const sequence = await Sequence.findOne({ _id: id, organizationId });
    if (!sequence) {
      return res.status(404).json({ success: false, error: 'Sequence not found' });
    }

    const { name, description, steps, isActive } = req.body;
    if (name !== undefined) sequence.name = name;
    if (description !== undefined) sequence.description = description;
    if (steps !== undefined) sequence.steps = steps;
    if (isActive !== undefined) sequence.isActive = isActive;

    await sequence.save();

    return res.status(200).json({
      success: true,
      message: 'Sequence updated successfully',
      data: sequence
    });
  } catch (error) {
    next(error);
  }
};

export const triggerLeadSequence = async (req, res, next) => {
  try {
    const { id } = req.params; // sequenceId
    const { leadId, stepIndex = 0 } = req.body;
    const organizationId = req.user.organizationId;

    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required in request body' });
    }

    const result = await executeSequenceStep({
      leadId,
      sequenceId: id,
      stepIndex,
      organizationId
    });

    return res.status(200).json({
      success: true,
      message: `Sequence step ${stepIndex + 1} executed for lead ${leadId}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSequence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const deleted = await Sequence.findOneAndDelete({ _id: id, organizationId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Sequence not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Sequence deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
