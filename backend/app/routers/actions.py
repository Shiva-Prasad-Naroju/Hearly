from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import PendingAction
from app.schemas import ApproveActionRequest, PendingActionOut

router = APIRouter(prefix="/api/actions", tags=["actions"])


async def _get_action_or_404(db: AsyncSession, action_id: str) -> PendingAction:
    result = await db.execute(select(PendingAction).where(PendingAction.id == action_id))
    a = result.scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return a


@router.get("", response_model=list[PendingActionOut])
async def list_actions(session_id: str | None = None, status: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(PendingAction)
    if session_id:
        stmt = stmt.where(PendingAction.session_id == session_id)
    if status:
        stmt = stmt.where(PendingAction.status == status)
    stmt = stmt.order_by(PendingAction.created_at.desc())
    result = await db.execute(stmt)
    return [PendingActionOut.model_validate(a) for a in result.scalars().all()]


@router.post("/{action_id}/approve", response_model=PendingActionOut)
async def approve_action(action_id: str, body: ApproveActionRequest, db: AsyncSession = Depends(get_db)):
    action = await _get_action_or_404(db, action_id)

    # Idempotent: approving an already-decided action returns its existing result, never re-executes
    if action.status in ("approved", "executed"):
        return PendingActionOut.model_validate(action)

    if body.edited_args:
        action.args = {**action.args, **body.edited_args}

    # MVP "execution" for draft_email is just producing a copyable/downloadable draft —
    # we NEVER auto-send. A real send would require a connected provider + a resolved address.
    action.status = "executed"
    action.decided_at = datetime.utcnow()
    args = action.args
    eml_text = (
        f"To: {args.get('to', '')}\n"
        f"Cc: {', '.join(args.get('cc', []) or [])}\n"
        f"Subject: {args.get('subject', '')}\n\n"
        f"{args.get('body', '')}\n"
    )
    action.result = {"eml_text": eml_text, "recipient_resolved": args.get("recipient_resolved", False)}
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return PendingActionOut.model_validate(action)


@router.post("/{action_id}/reject", response_model=PendingActionOut)
async def reject_action(action_id: str, db: AsyncSession = Depends(get_db)):
    action = await _get_action_or_404(db, action_id)
    if action.status == "pending":
        action.status = "rejected"
        action.decided_at = datetime.utcnow()
        db.add(action)
        await db.commit()
        await db.refresh(action)
    return PendingActionOut.model_validate(action)
