# VARK Adaptive Learning - Architecture Overview

**Status**: Design Phase Complete
**Version**: 1.0
**Created**: 2025-12-28

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (Vite)                         │   │
│  │                                                                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │   │
│  │  │ Dashboard      │  │ VARK Assess.   │  │ Chapter View    │   │   │
│  │  │                │  │                │  │                 │   │   │
│  │  │ - Prompt to   │  │ - 12 Questions │  │ ┌─────────────┐ │   │   │
│  │  │   assess      │  │ - Calculate    │  │ │ Content     │ │   │   │
│  │  │ - Recommend   │  │   scores       │  │ │ Variants    │ │   │   │
│  │  │   chapters    │  │ - Save profile │  │ │ (V/A/R/K)   │ │   │   │
│  │  └────────────────┘  └────────────────┘  │ └─────────────┘ │   │   │
│  │                                           │                 │   │   │
│  │                   VARKContext (State Management)            │   │   │
│  │                   - Profile: V/A/R/K%                       │   │   │
│  │                   - Settings: modality toggles              │   │   │
│  │                   - Persists to LocalStorage                │   │   │
│  │                                                              │   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │ │                                         │
│                              │ │ API Calls                               │
│                              ▼ ▼                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE PAGES (Backend)                         │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Hono Server (API Layer)                             │   │
│  │                                                                  │   │
│  │  GET  /api/vark/profile/:userId                                 │   │
│  │  POST /api/vark/profile                                         │   │
│  │  GET  /api/content/:contentId/status                            │   │
│  │  POST /api/progress/sync                                        │   │
│  │  GET  /api/recommendations/:userId                              │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              │ MCP Calls                                 │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │           MCP Server (Business Logic)                            │   │
│  │                                                                  │   │
│  │  Tool 1: calculateVARK(answers)                                  │   │
│  │          → Returns: V/A/R/K% + dominant style                   │   │
│  │                                                                  │   │
│  │  Tool 2: recommendContent(profile, chapterId?)                  │   │
│  │          → Returns: Ranked chapters + compatibility scores      │   │
│  │                                                                  │   │
│  │  Tool 3: getAnalytics(userId, timeRange)                        │   │
│  │          → Returns: Learning insights + trends                  │   │
│  │                                                                  │   │
│  │  Tool 4: checkContentStatus(contentId, type)                    │   │
│  │          → Returns: pending|ready|failed + URL                  │   │
│  │                                                                  │   │
│  │  Tool 5: syncProgress(userId, progressData)                     │   │
│  │          → Saves to backend database                            │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                   ┌───────────┼────────────┐
                   │           │            │
              API Calls    Webhook Calls    Status
                   │           │            │
                   ▼           ▼            ▼
        ┌─────────────────────────────────────────────┐
        │     n8n Orchestration Platform              │
        │                                             │
        │  Workflow 1: Auditory Generation            │
        │  ┌───────────────────────────────────────┐  │
        │  │ Webhook Trigger                       │  │
        │  │   ↓                                    │  │
        │  │ Format Text                           │  │
        │  │   ↓                                    │  │
        │  │ Call ElevenLabs API                   │  │
        │  │   ↓                                    │  │
        │  │ Upload to Cloudflare R2               │  │
        │  │   ↓                                    │  │
        │  │ Update Backend + Webhook Response     │  │
        │  └───────────────────────────────────────┘  │
        │                                             │
        │  Workflow 2: Visual Generation             │
        │  ┌───────────────────────────────────────┐  │
        │  │ Webhook Trigger                       │  │
        │  │   ↓                                    │  │
        │  │ Create Video Script                   │  │
        │  │   ↓                                    │  │
        │  │ Call Hedra API                        │  │
        │  │   ↓                                    │  │
        │  │ Poll for Completion (long-running)    │  │
        │  │   ↓                                    │  │
        │  │ Upload to R2                          │  │
        │  │   ↓                                    │  │
        │  │ Update Backend + Webhook Response     │  │
        │  └───────────────────────────────────────┘  │
        │                                             │
        │  Workflow 3: Content Sync                   │
        │  ┌───────────────────────────────────────┐  │
        │  │ Schedule Trigger (daily)              │  │
        │  │   ↓                                    │  │
        │  │ Check Missing Variants                │  │
        │  │   ↓                                    │  │
        │  │ Queue Generation (async)              │  │
        │  │   ↓                                    │  │
        │  │ Update Status + Notifications         │  │
        │  └───────────────────────────────────────┘  │
        │                                             │
        └─────────────────────────────────────────────┘
                         │    │
                         │    │
                ┌────────┘    └────────┐
                │                     │
                ▼                     ▼
        ┌────────────────┐   ┌────────────────┐
        │  ElevenLabs    │   │     Hedra      │
        │                │   │                │
        │ Text-to-Speech │   │ Avatar Video   │
        │ API            │   │ Generation API │
        └────────────────┘   └────────────────┘
                │                     │
                └────────────┬────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │  Cloudflare R2 (Media Storage) │
        │                                │
        │ .mp3 files (narration)         │
        │ .mp4 files (avatar videos)     │
        │ Metadata + CDN URLs            │
        │                                │
        └────────────────────────────────┘
```

---

## Data Flow: Complete User Journey

### 1. User Lands on App (First Time)

```
Browser Loads
    ↓
React App Initializes
    ├─ Check localStorage for VARK profile
    ├─ VARKContext initialized (empty)
    └─ Render Dashboard
        ↓
    Dashboard sees no profile
        ↓
    Show banner: "Take Assessment"
```

### 2. User Completes Assessment

```
User Clicks "Take Assessment"
    ↓
VARKAssessment Component Renders
    ├─ Display 12 questions in carousel
    └─ Collect user selections (V/A/R/K)
        ↓
    User answers all questions
        ↓
    Call calculateVARK() algorithm (local)
        ├─ Count V/A/R/K selections
        ├─ Calculate percentages (sum to 100%)
        └─ Determine dominant style
        ↓
    Save profile to VARKContext
        ├─ Also save to localStorage
        └─ Timestamp + version info
        ↓
    Callback: onComplete(profile)
        ↓
    Show VARKResults: "Your Profile"
        ├─ Display scores (V: 40%, A: 35%, R: 20%, K: 5%)
        ├─ Show dominant style
        └─ Key insights about learning
```

### 3. Dashboard Renders with Recommendations

```
User clicks "Start Learning"
    ↓
Dashboard Component Loads
    ├─ useVARK() hook gets profile from context
    └─ Call MCP: recommendContent(profile)
        ↓ (via API to Hono → MCP Server)
        ↓
    MCP calculates compatibility score for each chapter
        ├─ Visual chapters higher score for visual learners
        ├─ Auditory chapters higher for auditory learners
        └─ etc.
        ↓
    Return top 5 recommendations + scores
        ↓
    Dashboard displays:
        ├─ "Recommended for Your Style" section
        ├─ Ordered list with match % badges
        └─ "Start" buttons for each chapter
```

### 4. User Opens Chapter

```
User clicks chapter
    ↓
ChapterView Component Loads
    ├─ Checks VARKContext for profile
    └─ Calls recommendContent() for THIS chapter
        ↓
    MCP returns: { style: 'visual', compatibilityScore: 85 }
        ↓
    ChapterView header shows:
        "Optimized for your Visual learning style"
        ↓
    Phase 2 (future): Render VisualContent variant
        ├─ Show avatar videos
        └─ Prioritize diagrams/images
```

### 5. Content Generation (Phase 3)

```
When user is ready for audio/video:
    ↓
Frontend detects: "Audio not yet generated"
    ├─ Show: "Narration coming soon!"
    └─ Option: "Generate for me" (optional)
    ↓
Frontend calls: POST /api/content/generate
    ├─ Body: { chapterId: 1, contentType: 'auditory' }
    └─ Hono forwards to MCP
        ↓
    MCP triggers n8n webhook
        ↓
    n8n Workflow 1: Auditory Generation starts
        ├─ Step 1: Extract chapter text
        ├─ Step 2: Call ElevenLabs API
        │   ├─ "Please narrate this chapter..."
        │   └─ Voice: Female, American English
        ├─ Step 3: Get MP3 back
        ├─ Step 4: Upload to Cloudflare R2
        │   └─ Get signed public URL
        └─ Step 5: Return to Backend
            ├─ POST /api/content/1/status
            │   { status: 'ready', url: 'https://r2.../ch1.mp3', duration: 1200 }
            └─ Webhook callback to frontend
                ├─ Status: ready
                └─ Audio URL
    ↓
    Frontend receives webhook
        ├─ Show: "Your narration is ready!"
        ├─ AuditoryContent component loads
        └─ Audio player with playback controls
            ├─ Play/pause
            ├─ Speed: 0.75x - 1.5x
            └─ Transcript sync (optional)
```

---

## State Management Flow

### VARKContext (Single Source of Truth)

```javascript
const [varkProfile, setVARKProfile] = useState({
  visual: 40,
  auditory: 35,
  readWrite: 20,
  kinesthetic: 5,
  dominant: 'visual',
  timestamp: '2025-12-28T...'
});

const [adaptationSettings, setAdaptationSettings] = useState({
  enableAuditory: true,
  enableVisual: true,
  readWriteOptimization: true,
  kinestheticActivity: true,
  contentDensity: 'moderate',     // dense|moderate|sparse
  playbackSpeed: 1                 // 0.75|1|1.25|1.5
});
```

### Data Flow: Components → Context → LocalStorage

```
Component (ChapterView)
    │
    ├─ useVARK() hook
    │   └─ Gets: varkProfile, adaptationSettings
    │
    ├─ Renders based on profile
    │
    └─ User changes setting (e.g., speed to 1.5x)
        │
        ├─ setAdaptationSettings({ ...settings, playbackSpeed: 1.5 })
        │   │
        │   └─ VARKContext updates state
        │       │
        │       └─ useEffect() triggers
        │           │
        │           └─ localStorage.setItem('vark_settings', JSON.stringify(...))
        │
        └─ Component re-renders with new settings
```

---

## API Contract Examples

### GET /api/vark/profile/:userId

**Request:**
```
GET /api/vark/profile/user_123
Authorization: Bearer {token}
```

**Response:**
```json
{
  "visual": 40,
  "auditory": 35,
  "readWrite": 20,
  "kinesthetic": 5,
  "dominant": "visual",
  "timestamp": "2025-12-28T10:30:00Z",
  "assessmentVersion": 1
}
```

### POST /api/content/generate

**Request:**
```json
{
  "chapterId": 1,
  "contentType": "auditory",
  "voicePreference": "female-us",
  "priority": "normal"
}
```

**Response:**
```json
{
  "contentId": "ch1-auditory-001",
  "status": "processing",
  "estimatedTime": 120,
  "pollUrl": "/api/content/ch1-auditory-001/status"
}
```

### GET /api/content/:contentId/status

**Response (Processing):**
```json
{
  "contentId": "ch1-auditory-001",
  "status": "processing",
  "progress": 65,
  "estimatedTime": 45
}
```

**Response (Ready):**
```json
{
  "contentId": "ch1-auditory-001",
  "status": "ready",
  "url": "https://cdn.r2.../ch1-auditory.mp3",
  "duration": 1200,
  "voiceInfo": { "id": "elevenlabs_voice_12", "gender": "female" },
  "generatedAt": "2025-12-28T11:45:00Z"
}
```

### POST /api/recommendations/:userId

**Request:**
```json
{
  "limit": 5,
  "chapterId": null
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": 3,
      "title": "The Art of Discovery",
      "compatibilityScore": 92,
      "reason": "Highly visual content with diagrams",
      "estimatedTime": "45 min"
    },
    {
      "id": 5,
      "title": "Framework Mastery",
      "compatibilityScore": 88,
      "reason": "Interactive framework, good for visual learners",
      "estimatedTime": "50 min"
    }
  ]
}
```

---

## Database Schema (Phase 3+)

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### VARK Profiles Table
```sql
CREATE TABLE vark_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  visual INT NOT NULL,           -- 0-100
  auditory INT NOT NULL,         -- 0-100
  readWrite INT NOT NULL,        -- 0-100
  kinesthetic INT NOT NULL,      -- 0-100
  dominant_style TEXT NOT NULL,
  assessment_version INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Generated Content Table
```sql
CREATE TABLE generated_content (
  id TEXT PRIMARY KEY,
  chapter_id INT NOT NULL,
  content_type TEXT NOT NULL,    -- 'auditory' | 'visual'
  vark_version TEXT,
  status TEXT NOT NULL,          -- 'pending' | 'ready' | 'failed'
  url TEXT,                      -- Cloudflare R2 URL
  duration INT,                  -- seconds
  error_message TEXT,
  generated_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Error Handling & Resilience

### Scenario 1: Content Generation Fails

```
Frontend polls /api/content/ch1-auditory-001/status
    ↓
Response: { status: 'failed', error: 'ElevenLabs API unavailable' }
    ↓
Frontend shows:
    ├─ "Narration generation failed"
    ├─ "Reason: Temporary API issue"
    ├─ "Retry Later" button
    └─ Link to text version (fallback)
    ↓
User can:
    ├─ Click "Retry Later"
    └─ Continue reading text version
```

### Scenario 2: VARK Profile Lost

```
User clears browser cache
    ↓
App loads, no localStorage found
    ↓
VARKContext is empty
    ↓
Dashboard shows banner again
    ├─ "Your learning profile was cleared"
    ├─ "Retake assessment?" button
    └─ OR "Skip for now"
    ↓
If Backend is integrated (Phase 3):
    └─ Backend still has profile
        └─ Auto-restore from backend on login
```

### Scenario 3: Network Offline

```
User in offline mode (no internet)
    ↓
VARKContext loads from localStorage (works!)
    ├─ Profile available offline
    └─ Content variants still render
    ↓
Frontend can't reach /api/recommendations
    ↓
Show cached recommendations from previous session
    OR
Show all chapters without ranking
    ↓
When online again:
    └─ Sync progress + fetch fresh recommendations
```

---

## Performance Considerations

### Bundle Size Impact
- VARK components: ~15 KB (gzipped)
- Context + hooks: ~8 KB
- Total Phase 1 addition: ~23 KB
- **Impact on LCP**: Minimal (<100ms)

### Lazy Loading (Phase 2+)
```javascript
const AuditoryContent = lazy(() => import('./AuditoryContent'));
const VisualContent = lazy(() => import('./VisualContent'));

// Only downloaded when variant is selected
```

### Caching Strategy
- **VARK Profile**: Cached in Context + localStorage (always available)
- **Recommendations**: Cached for 24 hours + recompute on profile update
- **Content URLs**: Cache headers set by Cloudflare R2 (30 days)
- **Assessment Data**: Never cached (fresh each time)

### API Response Times (Target)
- Get Profile: <50ms
- Get Recommendations: <200ms
- Check Content Status: <50ms
- Calculate Analytics: <500ms (may be async)

---

## Security Model

### Authentication (Phase 3+)
- Frontend: Store JWT in httpOnly cookie
- API calls: Include JWT in Authorization header
- Hono middleware: Verify JWT before MCP call

### API Keys Management
- **ElevenLabs/Hedra keys**: Stored only in n8n (encrypted)
- **Cloudflare R2 creds**: Stored in backend env vars (never frontend)
- **Frontend**: No external API calls directly

### CORS Policy
```
Origin: https://playbook-domain.com
Methods: GET, POST, PUT, DELETE
Headers: Content-Type, Authorization
Credentials: include (for cookies)
```

### Data Privacy
- VARK profiles: User data (treat as sensitive)
- Progress data: User-owned (never share)
- Generated content: Copyright retained (fair use for education)

---

## Testing Matrix

### Unit Tests (Jest)
- [ ] VARK calculation algorithm
- [ ] VARKContext state management
- [ ] Component rendering with mocked data
- [ ] localStorage read/write

### Integration Tests
- [ ] MCP tools with real algorithms
- [ ] API endpoints with mocked DB
- [ ] n8n workflow simulation

### E2E Tests (Playwright)
- [ ] Full assessment flow (end-to-end)
- [ ] Content variant switching
- [ ] Audio/video playback (mocked media)
- [ ] Offline mode

### Manual Testing
- [ ] Browser compatibility (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness
- [ ] Dark mode (if applicable)
- [ ] Accessibility (keyboard nav, screen readers)

---

## Deployment Stages

### Stage 1: Development
- Local: `npm run dev` (Vite dev server)
- MCP: Local node process
- n8n: Local Docker container
- Database: None (localStorage only)

### Stage 2: Staging
- Frontend: Cloudflare Pages (staging domain)
- MCP: AWS Lambda (staging ARN)
- n8n: Staging instance
- Database: D1 staging (if available)

### Stage 3: Production
- Frontend: Cloudflare Pages (production domain)
- MCP: AWS Lambda (production ARN)
- n8n: Production instance
- Database: D1 production (if available)
- Storage: R2 production bucket

---

## Monitoring & Observability

### Metrics to Track
- VARK assessment completion rate
- Content generation success rate
- API response times (by endpoint)
- Error rates (by type)
- User engagement by learning style

### Alerting Thresholds
- API error rate > 1%: Alert
- Generation latency > 5 min: Alert
- R2 storage availability < 99.9%: Critical alert
- MCP server down: Critical alert

### Logging
- Frontend: Sentry for errors + console logs
- Backend: Winston/Pino structured logging
- n8n: Built-in execution logs
- Database: Query logs + slow query alerts

---

## Summary: Key Design Principles

1. **Progressive Enhancement**
   - Phase 1: Works without backend (LocalStorage)
   - Phase 2: Enhance with more content variants
   - Phase 3: Sync across devices + backend storage
   - Phase 4: Advanced analytics + AI coaching

2. **Graceful Degradation**
   - No audio? Show text
   - No recommendation? Show all chapters
   - Offline? Use cached data
   - API down? Fall back to LocalStorage

3. **Performance First**
   - Lazy load variants (don't download all)
   - Lazy load media (only when needed)
   - Cache aggressively (30-day URLs)
   - Async operations (polling, not blocking)

4. **User Privacy**
   - No tracking (unless opt-in)
   - Data stored locally by default
   - Backend sync is opt-in (Phase 3)
   - Clear privacy policy before assessment

5. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - High contrast mode
   - Captions for videos (future)

---

**Document Complete**

See `/home/ubuntu/.claude/plans/vark-implementation-plan.md` for full 13-section technical specification.

See `/home/ubuntu/projects/Playbook/BLUEPRINT.md` for project phases and timeline.

See `/home/ubuntu/projects/Playbook/docs/IMPLEMENTATION_QUICK_START.md` for Phase 1 code examples.
