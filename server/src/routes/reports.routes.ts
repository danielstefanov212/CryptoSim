import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { validate } from '../lib/validate.js';
import * as reportsService from '../services/reports.js';
import { runReport } from '../services/report-runner.js';
import { renderReportPdf } from '../services/pdf-renderer.js';
import {
  CreateReportBody,
  ReportIdParam,
  UpdateReportBody,
} from '../schemas/reports.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await reportsService.listForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', validate('body', CreateReportBody), async (req, res, next) => {
  try {
    const row = await reportsService.create(req.user!.id, req.body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate('params', ReportIdParam), async (req, res, next) => {
  try {
    const row = await reportsService.getOwned(req.user!.id, req.params.id as string);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  validate('params', ReportIdParam),
  validate('body', UpdateReportBody),
  async (req, res, next) => {
    try {
      const row = await reportsService.update(
        req.user!.id,
        req.params.id as string,
        req.body,
      );
      res.json(row);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id', validate('params', ReportIdParam), async (req, res, next) => {
  try {
    await reportsService.remove(req.user!.id, req.params.id as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/run', validate('params', ReportIdParam), async (req, res, next) => {
  try {
    const template = await reportsService.getOwned(req.user!.id, req.params.id as string);
    const result = await runReport(template);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export.pdf', validate('params', ReportIdParam), async (req, res, next) => {
  try {
    const template = await reportsService.getOwned(req.user!.id, req.params.id as string);
    const result = await runReport(template);
    const pdf = await renderReportPdf(result);
    res
      .status(200)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="report-${template.id}.pdf"`,
      )
      .send(pdf);
  } catch (err) {
    next(err);
  }
});

export { router as reportsRoutes };
