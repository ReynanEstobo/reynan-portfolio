import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import { z } from 'zod';
import { query } from './db.js';
import { fallbackProfile } from './profile.js';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional().default('')
});

export function createApp({ dbQuery = query, sendEmail } = {}) {
  const app = express();
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim());
  app.use(cors({ origin(origin, done) { return !origin || allowedOrigins.includes(origin) ? done(null, true) : done(new Error('Origin not allowed')); } }));
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/profile', async (_req, res, next) => {
    try {
      const { rows } = await dbQuery('SELECT name, role, location, education, bio, email, school_email AS "schoolEmail", github, facebook FROM profile LIMIT 1');
      res.json(rows[0] || fallbackProfile);
    } catch (error) { next(error); }
  });
  app.get('/api/projects', async (_req, res, next) => {
    try {
      const { rows } = await dbQuery(`SELECT p.id, p.slug, p.title, p.summary, p.highlight, p.stack, p.position,
        COALESCE(json_agg(json_build_object('label', l.label, 'url', l.url)) FILTER (WHERE l.id IS NOT NULL), '[]') AS links
        FROM projects p LEFT JOIN project_links l ON l.project_id = p.id
        GROUP BY p.id ORDER BY p.position`);
      res.json(rows);
    } catch (error) { next(error); }
  });

  const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many messages. Please try again in 15 minutes.' } });
  app.post('/api/contact', contactLimiter, async (req, res, next) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check the form fields and try again.', fields: parsed.error.flatten().fieldErrors });
    if (parsed.data.website) return res.status(204).end();
    const { name, email, subject, message } = parsed.data;
    try {
      const { rows } = await dbQuery('INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id', [name, email, subject, message]);
      try {
        if (sendEmail) await sendEmail({ name, email, subject, message });
        else if (process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({ from: process.env.EMAIL_FROM || 'Portfolio <onboarding@resend.dev>', to: [process.env.CONTACT_RECIPIENT || fallbackProfile.email], replyTo: email, subject: `[Portfolio] ${subject}`, text: `From: ${name} <${email}>\n\n${message}` });
        }
      } catch (emailError) { console.error('Email notification failed:', emailError.message); }
      res.status(201).json({ id: rows[0].id, message: 'Thanks — your message has been sent.' });
    } catch (error) { next(error); }
  });
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.message === 'Origin not allowed' ? 403 : 500).json({ error: error.message === 'Origin not allowed' ? error.message : 'Something went wrong. Please try again later.' });
  });
  return app;
}
