# Phase 1: Database & Auth Overhaul
- [x] Add auth dependencies to `requirements.txt` (passlib, python-jose, python-multipart, chromadb, langgraph)
- [x] Update `backend/database.py` to include `User` (with roles), `Department`, `Ward` models
- [x] Update `Grievance` model with new fields (images, escalation, assignee)
- [x] Create `backend/auth.py` for password hashing, JWT encoding/decoding, and RBAC dependencies
- [x] Create `backend/routers/auth.py` for login/signup endpoints
- [x] Integrate routers into `backend/main.py`
- [x] Seed database with default admin, officers, and departments
