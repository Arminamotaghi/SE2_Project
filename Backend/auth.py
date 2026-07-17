from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from database import get_db
import models
from security import get_password_hash, verify_password, create_access_token, decode_access_token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserCredentials(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(user: UserCredentials, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = get_password_hash(user.password)
    new_user = models.User(username=user.username, email=f"{user.username}@test.com", password_hash=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
def login(user: UserCredentials, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": str(db_user.id), "username": db_user.username})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,      
        secure=False,       
        samesite="lax",      
    )
    return {"message": "Login successful", "username": db_user.username}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user