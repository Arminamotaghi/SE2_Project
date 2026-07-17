-- Create Enums for Statuses
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'LOCKED', 'BOOKED');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE user_role AS ENUM ('ADMIN', 'CUSTOMER');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    role user_role DEFAULT 'CUSTOMER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Venues Table (Salons)
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    total_capacity INT NOT NULL
);

-- 3. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id),
    title VARCHAR(200) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seats Table (Physical layout of the venue)
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id),
    section_name VARCHAR(10) NOT NULL,
    row_name VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status seat_status DEFAULT 'AVAILABLE',
    UNIQUE (venue_id, section_name, row_name, seat_number)
);

-- 5. Reservations Table (Temporary holds and bookings)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    seat_id UUID REFERENCES seats(id),
    status reservation_status DEFAULT 'PENDING',
    locked_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);