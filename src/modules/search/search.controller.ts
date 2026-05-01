import { Request, Response } from 'express';
import { SearchService } from './search.service';
import { successResponse, errorResponse } from '../../common/response/response.formatter';

export const SearchController = {
  /**
   * Global search across all entities
   * GET /api/v1/search?q=searchTerm&limit=50
   */
  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      if (!query) {
        res.status(400).json(
          errorResponse('Search query is required', ['Query parameter "q" is mandatory'])
        );
        return;
      }

      const results = await SearchService.globalSearch(query, limit);
      res.status(200).json(successResponse('Global search completed successfully', results));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Search failed';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },

  /**
   * Advanced search with entity type filter
   * GET /api/v1/search/advanced?q=searchTerm&type=asset&limit=50&offset=0
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const entityType = req.query.type as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!query) {
        res.status(400).json(
          errorResponse('Search query is required', ['Query parameter "q" is mandatory'])
        );
        return;
      }

      const results = await SearchService.advancedSearch(query, {
        entityType,
        limit,
        offset,
      });

      res.status(200).json(successResponse('Advanced search completed successfully', results));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Advanced search failed';
      const errors = error.errors || [];
      res.status(statusCode).json(errorResponse(message, errors));
    }
  },
};
