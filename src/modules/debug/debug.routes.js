const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { notificationQueue } = require('../../queues/queue');

// Trigger a test push notification for the current user
router.post('/me/test-push', requireAuth, async (req, res, next) => {
  try {
    const title = req.body?.title || 'Test Notification';
    const body = req.body?.body || 'This is a test push from server.';
    await notificationQueue.add('notify', {
      userId: req.user.id,
      notifType: 'system',
      title,
      body,
    });
    res.status(202).json({ status: 'queued' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
