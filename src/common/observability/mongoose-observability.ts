import mongoose from 'mongoose';
import { ObservabilityService } from './observability.service';

let observabilityRegistered = false;

const getQueryPayload = (query: unknown) => {
  if (!query || typeof query !== 'object') {
    return {};
  }

  return query as Record<string, unknown>;
};

export const registerMongooseObservability = () => {
  if (observabilityRegistered) {
    return;
  }

  observabilityRegistered = true;

  mongoose.plugin((schema) => {
    schema.pre(/^find|count|update|delete/, function (this: any, next: (error?: any) => void) {
      this.__observabilityStartedAt = Date.now();
      next();
    });

    schema.post(/^find|count|update|delete/, function (this: any, _result: unknown, next: (error?: any) => void) {
      const startedAt = this.__observabilityStartedAt;
      if (typeof startedAt === 'number') {
        const durationMs = Date.now() - startedAt;
        ObservabilityService.recordSlowQuery(
          ObservabilityService.getQueryContextFromOperation(
            this.op || 'query',
            this.model?.modelName || 'UnknownModel',
            getQueryPayload(this.getQuery?.() || this._conditions || {})
          ),
          durationMs
        );
      }

      next();
    });

  });
};