# Bull Board Queue Monitoring

Professional BullMQ queue monitoring with Bull Board - much better than QueueDash!

## 🚀 **Quick Start**

### Start the Dashboard
```bash
pnpm dashboard
```

### Access the Dashboard
- **URL**: `http://localhost:3001/admin/queues`
- **Health Check**: `http://localhost:3001/health`

### Generate Test Data
```bash
pnpm queue:mock    # Safe mock jobs (no external APIs)
pnpm queue:test-service    # Real MusicBrainz API calls
```

## ✨ **Features**

- ✅ **Beautiful Professional UI** - Modern design with dark/light themes
- ✅ **Real-time Job Monitoring** - Live updates without rate limiting
- ✅ **Job Management** - Retry, delete, and manage jobs
- ✅ **Queue Statistics** - Performance metrics and insights
- ✅ **Error Tracking** - Detailed error logs and stack traces
- ✅ **No Refresh Issues** - Stable, reliable updates
- ✅ **Dedicated Server** - No conflicts with Next.js routing

## 📊 **What You'll See**

### Dashboard Overview
- **Queue Status**: Active, waiting, completed, failed job counts
- **Throughput**: Jobs per second and processing times
- **Memory Usage**: Queue memory consumption

### Job Details
- **Job Data**: Complete job payload and parameters
- **Processing Time**: Start, end, and duration
- **Retry History**: Failed attempts and retry logic
- **Stack Traces**: Full error details for debugging

### Queue Management
- **Pause/Resume**: Control queue processing
- **Clear Jobs**: Remove completed or failed jobs
- **Job Actions**: Retry failed jobs, promote delayed jobs

## 🔧 **Configuration**

The Bull Board server is configured in `src/scripts/bull-board-server.ts`:

- **Port**: 3001 (separate from Next.js)
- **Base Path**: `/admin/queues`
- **Queue**: MusicBrainz queue with rate limiting
- **Retention**: 100 completed, 50 failed jobs

## 🆚 **vs QueueDash**

| Feature | Bull Board ✅ | QueueDash ❌ |
|---------|---------------|---------------|
| UI Quality | Professional, polished | Basic, rough |
| Rate Limiting | No issues | Constant 429 errors |
| Refresh Stability | Stable | Blocks on refresh |
| Real-time Updates | Smooth | Choppy |
| Job Management | Full control | Limited |
| Documentation | Excellent | Sparse |
| Community | Large, active | Small |

## 🛠 **Development**

### Scripts
- `pnpm dashboard` - Start Bull Board server
- `pnpm queue:mock` - Generate mock test jobs
- `pnpm queue:test-service` - Test with real MusicBrainz jobs

### Files
- `src/scripts/bull-board-server.ts` - Express server setup
- `src/scripts/test-queue-dashboard.ts` - Mock job generator
- `src/lib/queue/musicbrainz-queue.ts` - Queue configuration

### Logs
Bull Board provides detailed console logging:
- Server startup and health
- Queue connection status
- Job processing events
- Error tracking

## 🔒 **Security**

The Bull Board server includes:
- Health check endpoint
- Error handling middleware
- Graceful shutdown handling
- Request logging for monitoring

## 🚀 **Production Considerations**

For production deployment:
1. **Authentication**: Add basic auth to Bull Board routes
2. **SSL**: Enable HTTPS for the dashboard
3. **Monitoring**: Add alerting for queue health
4. **Scaling**: Consider multiple queue instances

---

**Enjoy your professional queue monitoring! 🎉**
