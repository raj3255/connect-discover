// Report Routes - Report users
// Backend: PostgreSQL

export type ReportReason = 
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'underage'
  | 'violence'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  evidenceUrls?: string[];
  status: ReportStatus;
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRoutes {
  // POST /api/reports - Submit a report
  submitReport: (data: {
    userId: string;
    reason: ReportReason;
    description?: string;
    evidenceUrls?: string[];
  }) => Promise<Report>;
  
  // GET /api/reports/my - Get reports submitted by current user
  getMyReports: () => Promise<Report[]>;
  
  // POST /api/reports/:id/evidence - Upload evidence for report
  uploadEvidence: (reportId: string, files: File[]) => Promise<string[]>;
  
  // Admin routes
  // GET /api/admin/reports - Get all reports (admin only)
  getAllReports: (status?: ReportStatus, page?: number) => Promise<Report[]>;
  
  // PUT /api/admin/reports/:id - Update report status (admin only)
  updateReportStatus: (reportId: string, status: ReportStatus, notes?: string) => Promise<Report>;
}

// Example Express.js route handlers:
/*
router.post('/reports', authenticate, async (req, res) => {
  const { userId, reason, description, evidenceUrls } = req.body;
  
  if (userId === req.userId) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }
  
  // Check if already reported recently (prevent spam)
  const recentReport = await db.query(`
    SELECT 1 FROM reports 
    WHERE reporter_id = $1 AND reported_user_id = $2 AND created_at > NOW() - INTERVAL '24 hours'
  `, [req.userId, userId]);
  
  if (recentReport.rows.length > 0) {
    return res.status(400).json({ error: 'Already reported this user recently' });
  }
  
  const report = await db.query(`
    INSERT INTO reports (reporter_id, reported_user_id, reason, description, evidence_urls)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [req.userId, userId, reason, description, evidenceUrls || []]);
  
  // Notify admin (optional - via email, Slack, etc.)
  await notifyAdmins('new_report', report.rows[0]);
  
  // Auto-block the reported user for the reporter
  await db.query(`
    INSERT INTO blocks (blocker_id, blocked_id, reason)
    VALUES ($1, $2, 'Reported user')
    ON CONFLICT DO NOTHING
  `, [req.userId, userId]);
  
  res.status(201).json(report.rows[0]);
});

router.get('/reports/my', authenticate, async (req, res) => {
  const reports = await db.query(`
    SELECT r.*, u.name as reported_name, u.avatar as reported_avatar
    FROM reports r
    JOIN users u ON r.reported_user_id = u.id
    WHERE r.reporter_id = $1
    ORDER BY r.created_at DESC
  `, [req.userId]);
  
  res.json(reports.rows);
});

router.post('/reports/:id/evidence', authenticate, upload.array('evidence', 5), async (req, res) => {
  const { id } = req.params;
  
  // Verify reporter
  const report = await db.query('SELECT * FROM reports WHERE id = $1 AND reporter_id = $2', [id, req.userId]);
  
  if (report.rows.length === 0) {
    return res.status(403).json({ error: 'Not the reporter' });
  }
  
  const urls = await Promise.all(req.files.map(file => uploadToStorage(file)));
  
  await db.query(`
    UPDATE reports SET evidence_urls = array_cat(evidence_urls, $1::text[])
    WHERE id = $2
  `, [urls, id]);
  
  res.json({ urls });
});

// Admin routes
router.get('/admin/reports', authenticate, isAdmin, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT r.*, 
      reporter.name as reporter_name, reporter.email as reporter_email,
      reported.name as reported_name, reported.email as reported_email
    FROM reports r
    JOIN users reporter ON r.reporter_id = reporter.id
    JOIN users reported ON r.reported_user_id = reported.id
  `;
  
  const params = [];
  if (status) {
    query += ' WHERE r.status = $1';
    params.push(status);
  }
  
  query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const reports = await db.query(query, params);
  
  res.json(reports.rows);
});

router.put('/admin/reports/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  const report = await db.query(`
    UPDATE reports SET 
      status = $1, 
      admin_notes = $2, 
      resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END,
      resolved_by = CASE WHEN $1 IN ('resolved', 'dismissed') THEN $3 ELSE NULL END,
      updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [status, notes, req.userId, id]);
  
  // If resolved, take action on reported user if needed
  if (status === 'resolved' && notes?.includes('BAN')) {
    await db.query('UPDATE users SET banned = true, banned_at = NOW() WHERE id = $1', [report.rows[0].reported_user_id]);
  }
  
  res.json(report.rows[0]);
});
*/

// SQL Schema:
/*
CREATE TYPE report_reason AS ENUM (
  'inappropriate_content',
  'harassment',
  'spam',
  'fake_profile',
  'underage',
  'violence',
  'other'
);

CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status report_status DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Add banned column to users
ALTER TABLE users ADD COLUMN banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
*/
