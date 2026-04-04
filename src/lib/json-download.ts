import { Response } from 'express';

export function sendJsonDownload(
  res: Response,
  data: unknown,
  filename: string = 'export.json',
): void {
  if (!filename.endsWith('.json')) {
    filename += '.json';
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.send(JSON.stringify(data, null, 2));
}
