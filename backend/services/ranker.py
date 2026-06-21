from sqlalchemy.orm import Session
from models import MatchRecord


def rerank_candidates_for_jd(jd_id, db: Session) -> None:
    """
    Re-rank all candidates for a given JD by match_score descending.
    Updates the rank column for every affected match record.
    Called after every single match and bulk match operation.
    """
    records = (
        db.query(MatchRecord)
        .filter(MatchRecord.jd_id == jd_id)
        .order_by(MatchRecord.match_score.desc())
        .all()
    )

    for position, record in enumerate(records, start=1):
        record.rank = position

    db.commit()
