UPDATE projects
SET stack = CASE slug
  WHEN 'ic-laundry' THEN ARRAY['React', 'Vite', 'Node.js', 'Supabase']
  WHEN 'etl-pipeline' THEN ARRAY['Python', 'PostgreSQL', 'psycopg', 'Supabase Cron']
  WHEN 'jamaica-bday' THEN ARRAY['React', 'Vite', 'Tailwind CSS']
  WHEN 'interro-pick' THEN ARRAY['React', 'Vite', 'CSS Animation', 'Web Audio API']
  WHEN 'agots-frontend' THEN ARRAY['React', 'Vite', 'Tailwind CSS']
  WHEN 'agots-backend' THEN ARRAY['Node.js', 'Express', 'MongoDB', 'Socket.IO']
END
WHERE slug IN ('ic-laundry', 'etl-pipeline', 'jamaica-bday', 'interro-pick', 'agots-frontend', 'agots-backend');

