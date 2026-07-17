from database import engine, Base
import models

def init_database():
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)  

    print("Creating all tables with current models...")
    Base.metadata.create_all(bind=engine)  
    
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database()