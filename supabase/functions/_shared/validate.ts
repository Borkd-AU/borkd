import { z, ZodSchema } from 'https://esm.sh/zod@3.23.0';

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const json = await req.json();
  return schema.parse(json);
}
