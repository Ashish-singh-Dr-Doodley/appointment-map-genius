-- Create doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  start_location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_no INTEGER NOT NULL,
  pet_type TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  query_date TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  doctor_name TEXT,
  order_number INTEGER,
  source_of_order TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  location TEXT NOT NULL,
  detailed_address TEXT,
  issue TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  base_charges NUMERIC NOT NULL,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a route management app without user auth)
CREATE POLICY "Enable read access for all users" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.doctors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.doctors FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.doctors FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.appointments FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointments
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();