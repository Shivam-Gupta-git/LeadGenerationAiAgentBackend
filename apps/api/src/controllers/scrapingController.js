import { z } from 'zod';
import { scrapeWebsite } from '../services/scraping/scraperService.js';
import { AppError } from '../utils/AppError.js';

const inspectSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

export const inspectUrl = async (req, res, next) => {
  try {
    const { url } = inspectSchema.parse(req.body);

    const data = await scrapeWebsite(url);

    res.status(200).json({
      success: true,
      message: `Scraping inspect completed for ${url}`,
      data,
    });
  } catch (error) {
    next(error);
  }
};
