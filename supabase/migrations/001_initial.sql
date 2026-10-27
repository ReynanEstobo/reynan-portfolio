CREATE TABLE IF NOT EXISTS profile (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), name TEXT NOT NULL, role TEXT NOT NULL, location TEXT NOT NULL,
  education TEXT NOT NULL, bio TEXT NOT NULL, email TEXT NOT NULL, school_email TEXT NOT NULL, github TEXT NOT NULL, facebook TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL,
  highlight TEXT NOT NULL, stack TEXT[] NOT NULL DEFAULT '{}', position SMALLINT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS project_links (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL, url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL,
  message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO profile (id, name, role, location, education, bio, email, school_email, github, facebook) VALUES
(1, 'Reynan Estobo', 'AI-driven web developer', 'Balayan, Batangas, Philippines', 'Fourth-year BSIT student, Batangas State University — Balayan Campus', 'I build thoughtful web experiences and practical systems by combining strong development fundamentals with AI-assisted research, iteration, and problem-solving.', 'estoboreynan17@gmail.com', '23-14327@g.batstate-u.edu.ph', 'https://github.com/ReynanEstobo', 'https://web.facebook.com/beysik.111304')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, location = EXCLUDED.location, education = EXCLUDED.education, bio = EXCLUDED.bio, email = EXCLUDED.email, school_email = EXCLUDED.school_email, github = EXCLUDED.github, facebook = EXCLUDED.facebook;
INSERT INTO projects (slug, title, summary, highlight, stack, position) VALUES
('ic-laundry', 'I&C Laundry Management System', 'A centralized multi-branch laundry management system for customer records, orders, payments, inventory, analytics, and operational support.', 'Full-stack React interface separated from a server-only Node.js API.', ARRAY['React', 'Vite', 'Node.js', 'Supabase'], 1),
('etl-pipeline', 'I&C ETL Pipeline', 'A data pipeline project documenting extraction and transformation stages for laundry-management data.', 'Data-focused companion work that turns operational records into usable information.', ARRAY['Python', 'PostgreSQL', 'psycopg', 'Supabase Cron'], 2),
('jamaica-bday', 'Jamaica Bday', 'A React and Tailwind debut invitation with an envelope intro, countdown, gallery, RSVP flow, and ambient audio controls.', 'A detail-rich event experience rebuilt into reusable React components.', ARRAY['React', 'Vite', 'Tailwind CSS'], 3),
('interro-pick', 'InterroPick', 'A dramatic classroom random-name picker with theatrical roulette, reveal effects, sound synthesis, history, and fullscreen controls.', 'An interaction-first interface built with React, CSS animation, and the Web Audio API.', ARRAY['React', 'CSS animation', 'Web Audio API'], 4),
('agots-frontend', 'Agots Express — Frontend', 'The client-side half of the Agots Express project.', 'Paired with a dedicated backend repository to demonstrate separated application concerns.', ARRAY['React', 'Vite', 'Tailwind CSS'], 5),
('agots-backend', 'Agots Express — Backend', 'The server-side half of the Agots Express project.', 'A separate service repository paired with the Agots Express frontend.', ARRAY['Node.js', 'Express', 'MongoDB', 'Socket.IO'], 6)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO project_links (project_id, label, url)
SELECT id, 'View repository', CASE slug
 WHEN 'ic-laundry' THEN 'https://github.com/ReynanEstobo/IandCLaundry'
 WHEN 'etl-pipeline' THEN 'https://github.com/ReynanEstobo/I-C-ETL-Pipeline'
 WHEN 'jamaica-bday' THEN 'https://github.com/ReynanEstobo/Jamaica-Bday'
 WHEN 'interro-pick' THEN 'https://github.com/ReynanEstobo/Interro-Pick'
 WHEN 'agots-frontend' THEN 'https://github.com/ReynanEstobo/Agots-Express-frontend'
 WHEN 'agots-backend' THEN 'https://github.com/ReynanEstobo/Agots-Express-Backend' END
FROM projects WHERE NOT EXISTS (SELECT 1 FROM project_links l WHERE l.project_id = projects.id);
