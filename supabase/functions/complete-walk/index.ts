import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.0';
import { getUser } from '../_shared/auth.ts';
import { ok, error, preflight } from '../_shared/response.ts';
import { parseBody } from '../_shared/validate.ts';

const schema = z.object({
  walk_id: z.string().uuid(),
  distance_km: z.number().positive(),
  duration_seconds: z.number().int().positive(),
  route: z.array(z.tuple([z.number(), z.number()])).optional(),
  end_point: z.tuple([z.number(), z.number()]).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  const user = await getUser(req);
  if (!user) return error('Unauthorized', 401);

  let body: z.infer<typeof schema>;
  try {
    body = await parseBody(req, schema);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Invalid request body');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rpcData, error: rpcError } = await supabase.rpc('complete_walk', {
    walk_id: body.walk_id,
    final_distance_km: body.distance_km,
    final_duration_seconds: body.duration_seconds,
  });

  if (rpcError) return error(rpcError.message, 500);

  if (body.route && body.route.length > 0) {
    const coordinates = body.route.map(([lng, lat]) => [lng, lat]);
    const routeGeoJSON = {
      type: 'LineString',
      coordinates,
    };

    const updatePayload: Record<string, unknown> = { route: routeGeoJSON };
    if (body.end_point) {
      updatePayload.end_point = {
        type: 'Point',
        coordinates: body.end_point,
      };
    }

    const { error: updateError } = await supabase
      .from('walks')
      .update(updatePayload)
      .eq('id', body.walk_id)
      .eq('user_id', user.id);

    if (updateError) return error(updateError.message, 500);
  }

  return ok({ miles_earned: rpcData });
});
