import React, { useState, useMemo } from 'react';
import {
  Milk, Egg, PawPrint, Fish, Scissors, Store, Factory, UtensilsCrossed, Smartphone, Palette, Sprout, Sparkles,
  User, Phone, Calendar, GraduationCap, Users, MapPin, Home, Briefcase,
  ArrowRight, ArrowLeft, Loader2, AlertTriangle, PiggyBank, Percent,
  FileText, Plus, Trash2, Printer, TrendingUp, Package, Wrench, ClipboardList, RotateCcw, Building2, Wallet,
  Target, Rocket, Megaphone, ShieldCheck, Search, Landmark, ListChecks, Banknote
} from 'lucide-react';

const INK = '#16241F';
const MUTED = '#6b7a72';
const LINE = '#E3E8E3';
const PRIMARY = '#1F4B3F';
const PRIMARY_SOFT = '#EAF1EC';
const ACCENT = '#E8A33D';
const WARN = '#B33A3A';
const WARN_SOFT = '#FBF1E2';

/* ============================== SECTORS ============================== */
/* Modular framework: adding a new industry = adding one object here. */
const SECTORS = [
  { id: 'dairy', name: 'Dairy', icon: Milk, tint: '#2563eb', defaultUnit: 'litre',
    questions: [
      { id: 'animals', label: 'How many milking animals does she have?', icon: PawPrint, type: 'number' },
      { id: 'buyer', label: 'Who does she mainly sell to?', icon: Landmark, type: 'select', options: ['Cooperative', 'Collection centre', 'Retail customers', 'Other'] },
      { id: 'vet', label: 'Is veterinary support available?', icon: ShieldCheck, type: 'yesno' },
      { id: 'shed', label: 'Is a shed available?', icon: Home, type: 'yesno' },
    ] },
  { id: 'poultry', name: 'Poultry', icon: Egg, tint: '#d97706', defaultUnit: 'bird / egg',
    questions: [
      { id: 'birdType', label: 'Bird type', icon: Egg, type: 'select', options: ['Layer', 'Broiler', 'Backyard / country'] },
      { id: 'birds', label: 'Number of birds', icon: PawPrint, type: 'number' },
      { id: 'vaccination', label: 'Is vaccination support available?', icon: ShieldCheck, type: 'yesno' },
      { id: 'buyer', label: 'Main buyer / market channel', icon: Landmark, type: 'text' },
    ] },
  { id: 'goatery', name: 'Goat & Sheep Rearing', icon: PawPrint, tint: '#7c3aed', defaultUnit: 'animal',
    questions: [
      { id: 'breed', label: 'Breed', icon: PawPrint, type: 'text' },
      { id: 'animals', label: 'Number of animals', icon: PawPrint, type: 'number' },
      { id: 'grazing', label: 'Is grazing land available?', icon: Sprout, type: 'yesno' },
      { id: 'vet', label: 'Is veterinary support available?', icon: ShieldCheck, type: 'yesno' },
    ] },
  { id: 'fisheries', name: 'Fisheries', icon: Fish, tint: '#0891b2', defaultUnit: 'kg',
    questions: [
      { id: 'species', label: 'Species cultured', icon: Fish, type: 'text' },
      { id: 'pondArea', label: 'Pond / tank area', icon: Home, type: 'text', placeholder: 'e.g. 0.5 acre' },
      { id: 'waterYearRound', label: 'Is water available year-round?', icon: ShieldCheck, type: 'yesno' },
      { id: 'cycles', label: 'Production cycles per year', icon: Calendar, type: 'number' },
    ] },
  { id: 'tailoring', name: 'Tailoring & Garments', icon: Scissors, tint: '#db2777', defaultUnit: 'order',
    questions: [
      { id: 'machines', label: 'Number of sewing machines', icon: Scissors, type: 'number' },
      { id: 'custom', label: 'Custom-made or ready-made?', icon: FileText, type: 'select', options: ['Custom-made', 'Ready-made', 'Both'] },
      { id: 'segment', label: 'Main customer segment', icon: Users, type: 'text' },
      { id: 'seasonal', label: 'Does demand change by season (e.g. weddings)?', icon: TrendingUp, type: 'yesno' },
    ] },
  { id: 'grocery', name: 'Retail / Grocery / Kirana', icon: Store, tint: '#65a30d', defaultUnit: 'item',
    questions: [
      { id: 'ownership', label: 'Shop ownership', icon: Home, type: 'select', options: ['Owned', 'Rented'] },
      { id: 'supplier', label: 'Main supplier source', icon: Package, type: 'text' },
      { id: 'credit', label: 'Does she give customers credit?', icon: Banknote, type: 'yesno' },
      { id: 'turnoverDays', label: 'Approx. stock turnover (days)', icon: Calendar, type: 'number' },
    ] },
  { id: 'foodprocessing', name: 'Food Processing', icon: Factory, tint: '#ea580c', defaultUnit: 'unit',
    questions: [
      { id: 'fssai', label: 'Does she have FSSAI registration?', icon: ShieldCheck, type: 'yesno' },
      { id: 'shelfLife', label: 'Shelf life of product', icon: Calendar, type: 'text', placeholder: 'e.g. 3 months' },
      { id: 'seasonal', label: 'Does demand change by season?', icon: TrendingUp, type: 'yesno' },
      { id: 'rawSource', label: 'Where does she source raw material from?', icon: Package, type: 'text' },
    ] },
  { id: 'catering', name: 'Catering / Tiffin', icon: UtensilsCrossed, tint: '#c2410c', defaultUnit: 'order',
    questions: [
      { id: 'serviceType', label: 'Type of food service', icon: UtensilsCrossed, type: 'select', options: ['Tiffin service', 'Catering', 'Tea stall', 'Snack centre'] },
      { id: 'kitchen', label: 'Is a kitchen / workspace available?', icon: Home, type: 'yesno' },
      { id: 'fssai', label: 'Is FSSAI / local licence available?', icon: ShieldCheck, type: 'yesno' },
      { id: 'customerBase', label: 'Main customer base', icon: Users, type: 'text' },
    ] },
  { id: 'mobilerepair', name: 'Mobile Repair / CSC', icon: Smartphone, tint: '#4338ca', defaultUnit: 'service',
    questions: [
      { id: 'services', label: 'Main services offered', icon: Wrench, type: 'text' },
      { id: 'tools', label: 'Are tools / equipment available?', icon: Wrench, type: 'yesno' },
      { id: 'spares', label: 'Is a regular spares supplier available?', icon: Package, type: 'yesno' },
      { id: 'competition', label: 'Any competitor nearby?', icon: AlertTriangle, type: 'yesno' },
    ] },
  { id: 'handicrafts', name: 'Agarbatti / Handicrafts', icon: Palette, tint: '#a16207', defaultUnit: 'unit',
    questions: [
      { id: 'product', label: 'Product made', icon: Palette, type: 'text' },
      { id: 'workspace', label: 'Is workspace available?', icon: Home, type: 'yesno' },
      { id: 'buyer', label: 'Main buyer / market channel', icon: Landmark, type: 'text' },
      { id: 'seasonal', label: 'Does demand change by season (festivals)?', icon: TrendingUp, type: 'yesno' },
    ] },
  { id: 'vegetable', name: 'Vegetable Vending', icon: Sprout, tint: '#16a34a', defaultUnit: 'kg',
    questions: [
      { id: 'produce', label: 'Main produce sold', icon: Sprout, type: 'text' },
      { id: 'sellingUnit', label: 'Type of selling unit', icon: Store, type: 'select', options: ['Push cart', 'Roadside stall', 'Shop', 'Mobile van'] },
      { id: 'storage', label: 'Is storage / cold facility available?', icon: Home, type: 'yesno' },
      { id: 'procurement', label: 'Main procurement source', icon: Package, type: 'text' },
    ] },
  { id: 'beauty', name: 'Beauty Parlour & Salon', icon: Sparkles, tint: '#be185d', defaultUnit: 'service',
    questions: [
      { id: 'services', label: 'Main services offered', icon: Sparkles, type: 'text' },
      { id: 'chairs', label: 'Number of service chairs / stations', icon: Home, type: 'number' },
      { id: 'training', label: 'Has she received training / certification?', icon: GraduationCap, type: 'yesno' },
      { id: 'seasonal', label: 'Does demand change by season (weddings/festivals)?', icon: TrendingUp, type: 'yesno' },
    ] },
];

const EXPENSE_HEADS_COMMON = ['Rent', 'Electricity', 'Water', 'Gas / Fuel', 'Transportation', 'Labour / Wages', 'Salaries', 'Repairs & Maintenance', 'Communication / Internet', 'Marketing & Promotion', 'Delivery / Logistics', 'Storage', 'Insurance', 'Licenses / Registrations', 'Professional services', 'Miscellaneous'];
const EXPENSE_HEADS_BY_SECTOR = {
  dairy: ['Feed & fodder', 'Veterinary care'], poultry: ['Feed', 'Vaccination'], goatery: ['Feed & fodder', 'Veterinary care'],
  fisheries: ['Feed', 'Pond maintenance'], tailoring: ['Fabric', 'Machine maintenance'], grocery: ['Stock purchase'],
  foodprocessing: ['Raw materials', 'Packaging materials', 'FSSAI / testing fees'], catering: ['Raw materials / ingredients', 'Packaging / disposables'],
  mobilerepair: ['Spare parts / consumables'], handicrafts: ['Raw materials'], vegetable: ['Procurement cost'], beauty: ['Consumables / cosmetics'],
};
const FREQUENCIES = ['Monthly', 'Weekly', 'Quarterly', 'Yearly'];
const GOALS_LIST = ['Increase production', 'Add new products', 'Buy new equipment', 'Expand to new markets', 'Hire more people', 'Open another outlet', 'Sell online'];
const CHANNELS = ['Local market', 'Wholesale', 'Retail shops', 'Online', 'Social media', 'WhatsApp', 'Door-to-door', 'Exhibitions / Melas'];
const PRICING_STRATEGIES = ['Lowest price', 'Premium quality', 'Value for money', 'Convenience'];
const GENDERS = ['Female', 'Male', 'Other'];
const EDUCATION = ['Illiterate', 'Primary', 'Middle school', '10th pass', '12th pass', 'Graduate'];
const SOCIAL_CATS = ['General', 'OBC', 'SC', 'ST', 'Minority'];

/* ============================== LOCATION DATA ============================== */
/* Best-effort static state->district snapshot, embedded so the cascading picker works
   fully offline in this prototype. Districts change over time (state reorganizations) —
   swap this for the LGD (data.gov.in) or India Post API before this touches real loan files. */
const LOCATIONS = {
  'Andhra Pradesh': ['Srikakulam', 'Parvathipuram Manyam', 'Vizianagaram', 'Visakhapatnam', 'Alluri Sitharama Raju', 'Anakapalli', 'Kakinada', 'East Godavari', 'Konaseema', 'West Godavari', 'Eluru', 'Krishna', 'NTR', 'Guntur', 'Palnadu', 'Bapatla', 'Prakasam', 'SPSR Nellore', 'Kurnool', 'Nandyal', 'Anantapur', 'Sri Sathya Sai', 'YSR Kadapa', 'Annamayya', 'Chittoor', 'Tirupati'],
  'Arunachal Pradesh': ['Tawang', 'West Kameng', 'East Kameng', 'Papum Pare', 'Kurung Kumey', 'Kra Daadi', 'Lower Subansiri', 'Upper Subansiri', 'West Siang', 'East Siang', 'Siang', 'Upper Siang', 'Lower Siang', 'Lower Dibang Valley', 'Dibang Valley', 'Anjaw', 'Lohit', 'Namsai', 'Changlang', 'Tirap', 'Longding', 'Kamle', 'Shi Yomi', 'Lepa Rada', 'Pakke Kessang'],
  'Assam': ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Dima Hasao', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong', 'Bajali', 'Tamulpur'],
  'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
  'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja', 'Gaurela-Pendra-Marwahi'],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
  'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir', 'Vijayanagara'],
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Narmadapuram', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Dharashiv', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
  'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
  'Mizoram': ['Aizawl', 'Champhai', 'Hnahthial', 'Kolasib', 'Khawzawl', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saitual', 'Serchhip', 'Saiha'],
  'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto', 'Chumukedima', 'Niuland', 'Noklak', 'Shamator', 'Tseminyu'],
  'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
  'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'SAS Nagar', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran', 'Malerkotla'],
  'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
  'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim', 'Pakyong', 'Soreng'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Hanumakonda', 'Yadadri Bhuvanagiri'],
  'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddh Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Lakshadweep'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
};

/* ============================== HELPERS ============================== */
function fmt(n) { const v = Math.round(Number(n) || 0); return '₹' + v.toLocaleString('en-IN'); }
function toMonthly(amount, freq) {
  const a = Number(amount) || 0;
  if (freq === 'Weekly') return a * 4.33;
  if (freq === 'Quarterly') return a / 3;
  if (freq === 'Yearly') return a / 12;
  return a;
}
function suggestGrowth({ isExisting, goals }) {
  const has = (g) => goals.includes(g);
  const reasons = [];
  let base = isExisting ? 8 : 15;
  reasons.push(isExisting ? 'Existing business — steady base growth of 8%/year assumed.' : 'New business — higher Year 1 growth (15%) assumed as it ramps up from a low base.');
  let y1 = base, y2 = Math.max(base - 3, 3), y3 = Math.max(base - 5, 2);
  if (has('Buy new equipment')) { y1 += 5; reasons.push('+5% Year 1 — new equipment planned.'); }
  if (has('Add new products')) { y1 += 4; y2 += 2; reasons.push('+4% Year 1 / +2% Year 2 — new products planned.'); }
  if (has('Expand to new markets')) { y2 += 4; y3 += 2; reasons.push('+4% Year 2 / +2% Year 3 — market expansion planned.'); }
  if (has('Sell online')) { y2 += 3; reasons.push('+3% Year 2 — online selling planned.'); }
  if (has('Hire more people')) { y3 += 2; reasons.push('+2% Year 3 — hiring planned, more capacity.'); }
  const clamp = (v) => Math.max(2, Math.min(v, 35));
  return { y1: clamp(y1), y2: clamp(y2), y3: clamp(y3), reasons };
}
function initialFormData() {
  return {
    name: '', gender: '', age: '', mobile: '', education: '', socialCategory: '',
    familyMembers: '', earningMembers: '', dependents: '', familyIncome: '',
    existingBusiness: '', businessName: '', currentTurnover: '', currentExpenses: '', existingLoanEMI: '',
    otherSetupCost: '', ownContribution: '', requestedLoanAmount: '',
    tenure: '36', interestRate: '11.5', moratorium: '2',
  };
}
function newProduct() { return { id: Date.now() + Math.random(), name: '', unit: '', qty: '', sellingPrice: '', directCost: '', otherCost: '', maxCapacity: '' }; }
function newExpense(defaultHead) { return { id: Date.now() + Math.random(), head: defaultHead || '', customHead: '', amount: '', frequency: 'Monthly' }; }

/* ============================== UI PRIMITIVES ============================== */
function Field({ icon: Icon, label, hint, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3 mb-2">
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PRIMARY_SOFT }}>
          <Icon size={18} color={PRIMARY} />
        </div>
        <div className="pt-1.5">
          <div className="font-medium text-[15px]" style={{ color: INK }}>{label}</div>
          {hint && <div className="text-xs mt-0.5" style={{ color: MUTED }}>{hint}</div>}
        </div>
      </div>
      <div style={{ marginLeft: '48px' }}>{children}</div>
    </div>
  );
}
function TInput(props) {
  return <input {...props} className={'w-full rounded-lg border px-3.5 py-2.5 text-[15px] outline-none ' + (props.className || '')} style={{ borderColor: LINE, background: '#fff', color: INK, ...(props.style || {}) }} />;
}
function MiniField({ label, children }) {
  return <div><div className="text-xs mb-1" style={{ color: MUTED }}>{label}</div>{children}</div>;
}
function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="px-3.5 py-2 rounded-full border text-sm font-medium mr-2 mb-2"
      style={active ? { background: PRIMARY, color: '#fff', borderColor: PRIMARY } : { background: '#fff', color: INK, borderColor: LINE }}>
      {children}
    </button>
  );
}
function Select({ value, onChange, options, disabled, placeholder }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className="w-full rounded-lg border px-3.5 py-2.5 text-[15px]" style={{ borderColor: LINE, background: disabled ? '#F5F6F0' : '#fff', color: INK }}>
      <option value="">{placeholder || 'Select…'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1 mb-7">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < step ? PRIMARY : LINE }} />
      ))}
    </div>
  );
}
function NavRow({ onBack, onNext, nextLabel, nextDisabled }) {
  return (
    <div className="flex items-center justify-between mt-2">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium" style={{ color: MUTED }}>
        <ArrowLeft size={16} /> Back
      </button>
      <button type="button" onClick={onNext} disabled={nextDisabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
        style={nextDisabled ? { background: '#D8DED9', color: '#8a958e' } : { background: PRIMARY, color: '#fff' }}>
        {nextLabel || 'Continue'} <ArrowRight size={16} />
      </button>
    </div>
  );
}
function SectionCard({ children }) {
  return <div className="rounded-lg p-4 mb-4" style={{ background: PRIMARY_SOFT }}>{children}</div>;
}
function KV({ label, value }) {
  return (<><span style={{ color: PRIMARY }}>{label}</span><span className="text-right font-medium" style={{ color: PRIMARY }}>{value}</span></>);
}

/* ============================== MAIN APP ============================== */
export default function App() {
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState('');
  const [formData, setFormData] = useState(initialFormData());
  const [location, setLocation] = useState({ state: '', district: '', mandal: '', village: '', pincode: '' });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState(null);
  const [sectorAnswers, setSectorAnswers] = useState({});
  const [products, setProducts] = useState([newProduct()]);
  const [expenses, setExpenses] = useState([]);
  const [machinery, setMachinery] = useState([{ id: 1, name: '', cost: '' }]);
  const [futurePlan, setFuturePlan] = useState({ goals: [], loanGoal: '', threeYearVision: '' });
  const [marketing, setMarketing] = useState({ targetCustomers: '', currentChannels: [], proposedChannels: [], pricingStrategy: '', competitiveAdvantage: '' });
  const [assumptions, setAssumptions] = useState(null);
  const [assumptionsApproved, setAssumptionsApproved] = useState(false);
  const [businessPlan, setBusinessPlan] = useState(null);
  const [genError, setGenError] = useState(null);
  const [genErrorB, setGenErrorB] = useState(null);

  const update = (key, val) => setFormData(f => ({ ...f, [key]: val }));
  const updateLocation = (key, val) => setLocation(l => ({ ...l, [key]: val }));
  const updateSectorAnswer = (id, val) => setSectorAnswers(a => ({ ...a, [id]: val }));
  const updateProduct = (id, key, val) => setProducts(list => list.map(p => (p.id === id ? { ...p, [key]: val } : p)));
  const addProduct = () => setProducts(list => [...list, newProduct()]);
  const removeProduct = (id) => setProducts(list => (list.length > 1 ? list.filter(p => p.id !== id) : list));
  const updateExpense = (id, key, val) => setExpenses(list => list.map(e => (e.id === id ? { ...e, [key]: val } : e)));
  const addExpense = () => setExpenses(list => [...list, newExpense()]);
  const removeExpense = (id) => setExpenses(list => list.filter(e => e.id !== id));
  const addMachineryItem = () => setMachinery(list => [...list, { id: Date.now(), name: '', cost: '' }]);
  const removeMachineryItem = (id) => setMachinery(list => (list.length > 1 ? list.filter(m => m.id !== id) : list));
  const updateMachineryItem = (id, key, val) => setMachinery(list => list.map(m => (m.id === id ? { ...m, [key]: val } : m)));
  const toggleGoal = (g) => setFuturePlan(f => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x !== g) : [...f.goals, g] }));
  const toggleChannel = (key, c) => setMarketing(m => ({ ...m, [key]: m[key].includes(c) ? m[key].filter(x => x !== c) : [...m[key], c] }));

  const sectorCfg = useMemo(() => SECTORS.find(s => s.id === sector) || SECTORS[0], [sector]);

  const suggested = useMemo(() => suggestGrowth({ isExisting: formData.existingBusiness === 'yes', goals: futurePlan.goals }), [formData.existingBusiness, futurePlan.goals]);
  const effectiveAssumptions = assumptions || { y1: suggested.y1, y2: suggested.y2, y3: suggested.y3 };

  async function lookupPincode() {
    if (!location.pincode || location.pincode.length !== 6) { setPincodeError('Enter a 6-digit pincode.'); return; }
    setPincodeLoading(true); setPincodeError(null);
    try {
      const res = await fetch('https://api.postalpincode.in/pincode/' + location.pincode);
      const data = await res.json();
      const po = data && data[0] && data[0].Status === 'Success' ? data[0].PostOffice[0] : null;
      if (po) { setLocation(l => ({ ...l, state: po.State || l.state, district: po.District || l.district })); }
      else { setPincodeError("Couldn't find this pincode — please select state/district manually."); }
    } catch (e) { setPincodeError('Lookup unavailable right now — please select state/district manually.'); }
    finally { setPincodeLoading(false); }
  }

  const calc = useMemo(() => {
    const productRows = products.map(p => {
      const qty = Number(p.qty) || 0, price = Number(p.sellingPrice) || 0, directCost = Number(p.directCost) || 0, otherCost = Number(p.otherCost) || 0;
      const totalCostPerUnit = directCost + otherCost;
      const revenue = qty * price, cost = qty * totalCostPerUnit, grossProfit = revenue - cost;
      const marginPct = revenue ? (grossProfit / revenue) * 100 : 0;
      return { ...p, revenue, cost, grossProfit, marginPct, totalCostPerUnit };
    });
    const totalQty = productRows.reduce((s, p) => s + (Number(p.qty) || 0), 0);
    const totalRevenue = productRows.reduce((s, p) => s + p.revenue, 0);
    const totalDirectCost = productRows.reduce((s, p) => s + p.cost, 0);
    const totalGrossProfit = totalRevenue - totalDirectCost;
    const grossMarginPct = totalRevenue ? (totalGrossProfit / totalRevenue) * 100 : 0;

    const expenseRows = expenses.map(e => ({ ...e, displayHead: e.head === '__custom' ? (e.customHead || 'Custom') : e.head, monthly: toMonthly(e.amount, e.frequency) }));
    const totalOpexMonthly = expenseRows.reduce((s, e) => s + e.monthly, 0);
    const totalOpexAnnual = totalOpexMonthly * 12;
    const netOperatingProfit = totalGrossProfit - totalOpexMonthly;

    const machineryTotal = machinery.reduce((s, m) => s + (Number(m.cost) || 0), 0);
    const otherSetupCost = Number(formData.otherSetupCost) || 0;
    const totalProjectCost = machineryTotal + otherSetupCost;
    const ownContribution = Number(formData.ownContribution) || 0;
    const loanRequired = Math.max(totalProjectCost - ownContribution, 0);

    const rate = Number(formData.interestRate) || 0, tenure = Number(formData.tenure) || 0;
    const r = rate / 12 / 100;
    let emi = 0;
    if (loanRequired > 0 && tenure > 0) emi = r > 0 ? (loanRequired * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1) : loanRequired / tenure;

    const existingLoanEMI = Number(formData.existingLoanEMI) || 0;
    const totalDebtService = existingLoanEMI + emi;
    const dscr = totalDebtService > 0 ? netOperatingProfit / totalDebtService : null;

    const single = productRows.length === 1 ? productRows[0] : null;
    const breakEvenQty = single && single.sellingPrice > 0 && (single.sellingPrice - single.totalCostPerUnit) > 0
      ? Math.ceil(totalOpexMonthly / (single.sellingPrice - single.totalCostPerUnit)) : null;

    const baselineAnnualRevenue = totalRevenue * 12, baselineAnnualOpex = totalOpexMonthly * 12;
    let prevRevenue = baselineAnnualRevenue, prevOpex = baselineAnnualOpex, prevNetProfit = null;
    const projection = [1, 2, 3].map(yr => {
      const g = Number(effectiveAssumptions['y' + yr]) || 0;
      const revenue = prevRevenue * (1 + g / 100);
      const directCost = revenue * (1 - grossMarginPct / 100);
      const grossProfit = revenue - directCost;
      const opexGrowth = Math.min(g, 5);
      const opex = prevOpex * (1 + opexGrowth / 100);
      const ebitda = grossProfit - opex;
      const emiMonths = yr === 1 ? Math.max(12 - (Number(formData.moratorium) || 0), 0) : 12;
      const financeCost = existingLoanEMI * 12 + emi * emiMonths;
      const netProfit = ebitda - financeCost;
      const netMarginPct = revenue ? (netProfit / revenue) * 100 : 0;
      const expenseRatio = revenue ? (opex / revenue) * 100 : 0;
      const profitGrowthPct = (prevNetProfit !== null && prevNetProfit !== 0) ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null;
      const row = { year: yr, growthPct: g, revenue, directCost, grossProfit, opex, ebitda, financeCost, netProfit, grossMarginPct, netMarginPct, expenseRatio, profitGrowthPct };
      prevRevenue = revenue; prevOpex = opex; prevNetProfit = netProfit;
      return row;
    });

    const validations = [];
    if (productRows.length === 0 || productRows.every(p => !p.qty)) validations.push('No products added yet — revenue cannot be calculated.');
    productRows.forEach(p => {
      if (p.sellingPrice > 0 && p.marginPct > 80) validations.push('"' + (p.name || 'A product') + '" shows an unusually high margin (' + p.marginPct.toFixed(0) + '%) — double-check the cost figures.');
      if (p.sellingPrice > 0 && p.marginPct < 5) validations.push('"' + (p.name || 'A product') + '" shows a very thin margin (' + p.marginPct.toFixed(0) + '%) — check whether all direct costs were captured.');
      if (p.maxCapacity && Number(p.maxCapacity) > 0) {
        const factor = (1 + (Number(effectiveAssumptions.y1) || 0) / 100) * (1 + (Number(effectiveAssumptions.y2) || 0) / 100) * (1 + (Number(effectiveAssumptions.y3) || 0) / 100);
        const y3Qty = (Number(p.qty) || 0) * factor;
        if (y3Qty > Number(p.maxCapacity)) validations.push('By Year 3, projected sales of "' + (p.name || 'a product') + '" (~' + Math.round(y3Qty) + '/month) exceed her stated production capacity (' + p.maxCapacity + '/month). Review capacity or growth assumptions.');
      }
    });
    ['y1', 'y2', 'y3'].forEach((k, i) => { if (Number(effectiveAssumptions[k]) > 50) validations.push('Year ' + (i + 1) + ' growth assumption (' + effectiveAssumptions[k] + '%) is unusually high — please confirm this is realistic.'); });
    if (expenseRows.length === 0) validations.push('No expenses captured yet — the profit figure likely overstates what she actually keeps.');
    if (dscr !== null && dscr < 1.2) validations.push('Indicative repayment coverage is tight (' + dscr.toFixed(2) + '×) — consider a longer tenure or smaller loan.');
    projection.forEach(row => { if (row.netProfit < 0) validations.push('Year ' + row.year + ' projected profit is negative after loan repayment — review assumptions.'); });
    if (formData.requestedLoanAmount) {
      const req = Number(formData.requestedLoanAmount);
      if (loanRequired > 0 && Math.abs(req - loanRequired) / loanRequired * 100 > 10) validations.push('Requested loan amount (' + fmt(req) + ') differs from the calculated requirement (' + fmt(loanRequired) + ') by more than 10% — please review.');
    }
    const statedTurnover = Number(formData.currentTurnover) || 0;
    const revenueDiffPct = statedTurnover > 0 ? Math.abs(totalRevenue - statedTurnover) / statedTurnover * 100 : null;
    if (revenueDiffPct !== null && revenueDiffPct > 15) validations.push("What she told us for current turnover doesn't match her product-level numbers (off by " + revenueDiffPct.toFixed(0) + '%) — worth double-checking.');

    return { productRows, totalQty, totalRevenue, totalDirectCost, totalGrossProfit, grossMarginPct, expenseRows, totalOpexMonthly, totalOpexAnnual, netOperatingProfit, machineryTotal, otherSetupCost, totalProjectCost, ownContribution, loanRequired, emi, existingLoanEMI, totalDebtService, dscr, breakEvenQty, projection, validations, revenueDiffPct };
  }, [products, expenses, machinery, formData, effectiveAssumptions]);

  const reset = () => {
    setStep(0); setSector(''); setFormData(initialFormData());
    setLocation({ state: '', district: '', mandal: '', village: '', pincode: '' });
    setSectorAnswers({}); setProducts([newProduct()]); setExpenses([]);
    setMachinery([{ id: 1, name: '', cost: '' }]);
    setFuturePlan({ goals: [], loanGoal: '', threeYearVision: '' });
    setMarketing({ targetCustomers: '', currentChannels: [], proposedChannels: [], pricingStrategy: '', competitiveAdvantage: '' });
    setAssumptions(null); setAssumptionsApproved(false);
    setBusinessPlan(null); setGenError(null); setGenErrorB(null);
  };

  function buildPayload() {
    return {
      entrepreneur: { name: formData.name, gender: formData.gender, age: formData.age, education: formData.education, socialCategory: formData.socialCategory },
      location: { village: location.village, mandal: location.mandal, district: location.district, state: location.state },
      business: { sector: sectorCfg.name, stage: formData.existingBusiness === 'yes' ? 'Existing' : 'New', businessName: formData.businessName, sectorDetails: sectorAnswers },
      products: calc.productRows.filter(p => p.qty).map(p => ({ name: p.name, unit: p.unit, qtyPerMonth: p.qty, sellingPrice: p.sellingPrice, revenue: Math.round(p.revenue), marginPct: Math.round(p.marginPct) })),
      financials: {
        monthlyRevenue: Math.round(calc.totalRevenue), monthlyExpenses: Math.round(calc.totalOpexMonthly), monthlyOperatingProfit: Math.round(calc.netOperatingProfit),
        grossMarginPct: Math.round(calc.grossMarginPct), totalProjectCost: Math.round(calc.totalProjectCost), ownContribution: calc.ownContribution,
        loanRequired: Math.round(calc.loanRequired), emi: Math.round(calc.emi), indicativeDSCR: calc.dscr ? Number(calc.dscr.toFixed(2)) : null,
      },
      threeYearProjection: calc.projection.map(r => ({ year: r.year, growthPctAssumed: r.growthPct, revenue: Math.round(r.revenue), netProfit: Math.round(r.netProfit) })),
      futurePlan: { goals: futurePlan.goals, loanGoal: futurePlan.loanGoal, threeYearVision: futurePlan.threeYearVision },
      marketing: { targetCustomers: marketing.targetCustomers, currentChannels: marketing.currentChannels, proposedChannels: marketing.proposedChannels, pricingStrategy: marketing.pricingStrategy, competitiveAdvantage: marketing.competitiveAdvantage },
      validations: calc.validations,
    };
  }

  async function callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  async function generatePlan() {
    setStep(14); setGenError(null); setGenErrorB(null);
    const payload = buildPayload();
    try {
      const promptA = 'You are helping write a microloan Business Plan/DPR for a woman entrepreneur in rural India, based on data a field worker collected. ' +
        'Here is the structured, already-validated data — every number is FINAL. Do not change, recalculate, or invent any number:\n\n' + JSON.stringify(payload, null, 2) +
        '\n\nWrite ONLY narrative content, in plain, warm, professional English suitable for a bank loan file, grounded only in the data above. ' +
        'Respond with ONLY a raw JSON object (no markdown fences, no commentary) with exactly these string keys, each 2-3 sentences:\n' +
        '{"executiveSummary":"...","businessDescription":"...","marketAnalysis":"...","risksAndMitigation":"...","conclusion":"..."}';
      const resA = await callClaude(promptA);
      setBusinessPlan(prev => ({ ...(prev || {}), ...resA }));
    } catch (e) { setGenError("Couldn't generate the core narrative sections — calculated financials below are unaffected."); }
    try {
      const promptB = 'Using this same structured entrepreneur/business data:\n\n' + JSON.stringify(payload, null, 2) +
        "\n\nWrite three things, grounded ONLY in the data above — never use generic statements that aren't supported by the data given:\n" +
        '1. A short marketing plan (2-3 sentences), considering industry + location + target customer + current/proposed channels + future goals.\n' +
        '2. A future growth plan with one short sentence each for year1, year2, year3, consistent with the threeYearProjection numbers given.\n' +
        '3. A SWOT analysis — 2 items per category (strengths, weaknesses, opportunities, threats), each item ONE sentence that names the specific data point behind it.\n' +
        'Respond with ONLY a raw JSON object (no markdown fences, no commentary):\n' +
        '{"marketingPlan":"...","futureGrowthPlan":{"year1":"...","year2":"...","year3":"..."},"swot":{"strengths":["...","..."],"weaknesses":["...","..."],"opportunities":["...","..."],"threats":["...","..."]}}';
      const resB = await callClaude(promptB);
      setBusinessPlan(prev => ({ ...(prev || {}), ...resB }));
    } catch (e) { setGenErrorB("Couldn't generate the marketing/SWOT/future-plan sections — everything else is unaffected."); }
    setStep(15);
  }

  const fonts = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
      .dsk-app, .dsk-app input, .dsk-app button, .dsk-app select { font-family: 'Manrope', sans-serif; }
      .dsk-display { font-family: 'Fraunces', serif; }
      .dsk-app input:focus, .dsk-app select:focus { border-color: ${PRIMARY} !important; }
      @media print { .no-print { display: none !important; } }
    `}</style>
  );

  let body = null;

  if (step === 0) {
    body = (
      <div className="text-center py-14">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: PRIMARY }}>
          <ClipboardList color="#fff" size={26} />
        </div>
        <h1 className="dsk-display text-3xl mb-3" style={{ color: INK, fontWeight: 600 }}>DSK Business Plan Assistant</h1>
        <p className="max-w-sm mx-auto mb-9 text-[15px]" style={{ color: MUTED }}>
          Products, costing, expenses, location, 3-year projections, marketing plan and SWOT — all in one guided flow. No financial modelling needed.
        </p>
        <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full font-medium inline-flex items-center gap-2" style={{ background: ACCENT, color: INK }}>
          Start a new entrepreneur <ArrowRight size={18} />
        </button>
        <p className="text-xs mt-8" style={{ color: '#93a199' }}>Prototype · Access Livelihoods · Digital Seva Kendra</p>
      </div>
    );
  } else if (step === 1) {
    body = (
      <div>
        <ProgressBar step={1} total={13} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: INK }}>Which business is this for?</h2>
        <p className="text-sm mb-6" style={{ color: MUTED }}>Choose the enterprise type closest to what she does.</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {SECTORS.map(s => {
            const Icon = s.icon, active = sector === s.id;
            return (
              <button key={s.id} type="button" onClick={() => { setSector(s.id); setProducts([newProduct()]); setExpenses([]); setSectorAnswers({}); }}
                className="rounded-xl p-3 text-center border flex flex-col items-center gap-2"
                style={active ? { borderColor: s.tint, background: s.tint + '14' } : { borderColor: LINE, background: '#fff' }}>
                <Icon size={22} color={active ? s.tint : MUTED} />
                <span className="text-xs font-medium leading-tight" style={{ color: INK }}>{s.name}</span>
              </button>
            );
          })}
        </div>
        <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!sector} />
      </div>
    );
  } else if (step === 2) {
    body = (
      <div>
        <ProgressBar step={2} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Where is the business located?</h2>
        <Field icon={MapPin} label="State">
          <Select value={location.state} onChange={e => { updateLocation('state', e.target.value); updateLocation('district', ''); }} options={Object.keys(LOCATIONS).sort()} placeholder="Select state…" />
        </Field>
        <Field icon={MapPin} label="District">
          <Select value={location.district} onChange={e => updateLocation('district', e.target.value)} options={LOCATIONS[location.state] || []} disabled={!location.state} placeholder={location.state ? 'Select district…' : 'Select state first'} />
        </Field>
        <Field icon={MapPin} label="Mandal / Taluk / Block">
          <TInput value={location.mandal} onChange={e => updateLocation('mandal', e.target.value)} />
        </Field>
        <Field icon={MapPin} label="Village">
          <TInput value={location.village} onChange={e => updateLocation('village', e.target.value)} />
        </Field>
        <Field icon={Search} label="Pincode" hint="Optional — we'll try to auto-fill state & district.">
          <div className="flex gap-2">
            <TInput value={location.pincode} onChange={e => updateLocation('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ maxWidth: '140px' }} />
            <button type="button" onClick={lookupPincode} className="px-3.5 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: LINE, color: PRIMARY }}>
              {pincodeLoading ? 'Looking up…' : 'Look up'}
            </button>
          </div>
          {pincodeError && <div className="text-xs mt-1" style={{ color: WARN }}>{pincodeError}</div>}
        </Field>
        <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!location.state || !location.district} />
      </div>
    );
  } else if (step === 3) {
    body = (
      <div>
        <ProgressBar step={3} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Entrepreneur & household</h2>
        <Field icon={User} label="Full name">
          <TInput value={formData.name} onChange={e => update('name', e.target.value)} placeholder="As per Aadhaar" />
        </Field>
        <Field icon={Users} label="Gender">
          {GENDERS.map(g => <Chip key={g} active={formData.gender === g} onClick={() => update('gender', g)}>{g}</Chip>)}
        </Field>
        <Field icon={Calendar} label="Age">
          <TInput type="number" inputMode="numeric" value={formData.age} onChange={e => update('age', e.target.value)} style={{ maxWidth: '140px' }} />
        </Field>
        <Field icon={Phone} label="Mobile number">
          <TInput type="tel" inputMode="numeric" value={formData.mobile} onChange={e => update('mobile', e.target.value)} placeholder="10-digit number" />
        </Field>
        <Field icon={GraduationCap} label="Education level">
          {EDUCATION.map(g => <Chip key={g} active={formData.education === g} onClick={() => update('education', g)}>{g}</Chip>)}
        </Field>
        <Field icon={Users} label="Social category">
          {SOCIAL_CATS.map(g => <Chip key={g} active={formData.socialCategory === g} onClick={() => update('socialCategory', g)}>{g}</Chip>)}
        </Field>
        <Field icon={Home} label="Household" hint="Members, earning members, dependents">
          <div className="flex gap-2">
            <TInput type="number" inputMode="numeric" value={formData.familyMembers} onChange={e => update('familyMembers', e.target.value)} placeholder="Members" />
            <TInput type="number" inputMode="numeric" value={formData.earningMembers} onChange={e => update('earningMembers', e.target.value)} placeholder="Earning" />
            <TInput type="number" inputMode="numeric" value={formData.dependents} onChange={e => update('dependents', e.target.value)} placeholder="Dependents" />
          </div>
        </Field>
        <Field icon={Wallet} label="Total monthly family income (₹)">
          <TInput type="number" inputMode="numeric" value={formData.familyIncome} onChange={e => update('familyIncome', e.target.value)} />
        </Field>
        <NavRow onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!formData.name} />
      </div>
    );
  } else if (step === 4) {
    body = (
      <div>
        <ProgressBar step={4} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Existing business</h2>
        <Field icon={Briefcase} label="Does she already run a business?">
          <Chip active={formData.existingBusiness === 'yes'} onClick={() => update('existingBusiness', 'yes')}>Yes, existing business</Chip>
          <Chip active={formData.existingBusiness === 'no'} onClick={() => update('existingBusiness', 'no')}>No, new idea</Chip>
        </Field>
        {formData.existingBusiness === 'yes' && (
          <>
            <Field icon={FileText} label="Business name">
              <TInput value={formData.businessName} onChange={e => update('businessName', e.target.value)} />
            </Field>
            <Field icon={TrendingUp} label="Current monthly turnover (₹)" hint="We'll cross-check this against the product numbers you enter next.">
              <TInput type="number" inputMode="numeric" value={formData.currentTurnover} onChange={e => update('currentTurnover', e.target.value)} />
            </Field>
            <Field icon={Banknote} label="Existing loan EMI, if any (₹/month)">
              <TInput type="number" inputMode="numeric" value={formData.existingLoanEMI} onChange={e => update('existingLoanEMI', e.target.value)} style={{ maxWidth: '200px' }} />
            </Field>
          </>
        )}
        {formData.existingBusiness === 'no' && (
          <div className="rounded-lg p-4 text-sm mb-4" style={{ background: PRIMARY_SOFT, color: PRIMARY }}>
            Understood — this is a new business. The products you enter next will be used as the Year 1 plan.
          </div>
        )}
        <NavRow onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!formData.existingBusiness} />
      </div>
    );
  } else if (step === 5) {
    body = (
      <div>
        <ProgressBar step={5} total={13} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: INK }}>Products & costing</h2>
        <p className="text-sm mb-5" style={{ color: MUTED }}>Add every product or service she sells — this drives the revenue and profit calculations automatically.</p>
        {products.map((p, i) => (
          <div key={p.id} className="rounded-lg border p-4 mb-3" style={{ borderColor: LINE }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium" style={{ color: INK }}>Product {i + 1}</span>
              <button type="button" onClick={() => removeProduct(p.id)} style={{ color: WARN }}><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniField label="Product name"><TInput value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} /></MiniField>
              <MiniField label="Unit"><TInput value={p.unit} onChange={e => updateProduct(p.id, 'unit', e.target.value)} placeholder={sectorCfg.defaultUnit} /></MiniField>
              <MiniField label="Qty / month"><TInput type="number" inputMode="numeric" value={p.qty} onChange={e => updateProduct(p.id, 'qty', e.target.value)} /></MiniField>
              <MiniField label="Selling price / unit (₹)"><TInput type="number" inputMode="numeric" value={p.sellingPrice} onChange={e => updateProduct(p.id, 'sellingPrice', e.target.value)} /></MiniField>
              <MiniField label="Direct cost / unit (₹)"><TInput type="number" inputMode="numeric" value={p.directCost} onChange={e => updateProduct(p.id, 'directCost', e.target.value)} /></MiniField>
              <MiniField label="Other variable cost / unit (₹)"><TInput type="number" inputMode="numeric" value={p.otherCost} onChange={e => updateProduct(p.id, 'otherCost', e.target.value)} /></MiniField>
              <MiniField label="Max production capacity / month (optional)"><TInput type="number" inputMode="numeric" value={p.maxCapacity} onChange={e => updateProduct(p.id, 'maxCapacity', e.target.value)} /></MiniField>
            </div>
            {p.qty && p.sellingPrice && (
              <div className="text-xs pt-3 mt-3 border-t flex justify-between" style={{ borderColor: LINE, color: PRIMARY }}>
                <span>Revenue: {fmt((Number(p.qty) || 0) * (Number(p.sellingPrice) || 0))}/mo</span>
                <span>Margin: {(((Number(p.sellingPrice) || 0) - (Number(p.directCost) || 0) - (Number(p.otherCost) || 0)) / (Number(p.sellingPrice) || 1) * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={addProduct} className="inline-flex items-center gap-1.5 text-sm font-medium mb-5" style={{ color: PRIMARY }}>
          <Plus size={16} /> Add another product
        </button>
        <SectionCard>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <KV label="Total monthly revenue (calculated)" value={fmt(calc.totalRevenue)} />
            <KV label="Total direct cost (calculated)" value={fmt(calc.totalDirectCost)} />
            <KV label="Gross profit (calculated)" value={fmt(calc.totalGrossProfit)} />
            <KV label="Weighted average margin" value={calc.grossMarginPct.toFixed(0) + '%'} />
          </div>
        </SectionCard>
        <NavRow onBack={() => setStep(4)} onNext={() => setStep(6)} nextDisabled={!products.some(p => p.qty && p.sellingPrice)} />
      </div>
    );
  } else if (step === 6) {
    body = (
      <div>
        <ProgressBar step={6} total={13} />
        <div className="flex items-center gap-2 mb-1">
          <sectorCfg.icon size={20} color={sectorCfg.tint} />
          <h2 className="text-xl font-semibold" style={{ color: INK }}>{sectorCfg.name} — a few more details</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: MUTED }}>These help shape the market analysis and risk sections of the plan.</p>
        {sectorCfg.questions.map(q => (
          <Field key={q.id} icon={q.icon} label={q.label}>
            {q.type === 'yesno' && (<>
              <Chip active={sectorAnswers[q.id] === 'Yes'} onClick={() => updateSectorAnswer(q.id, 'Yes')}>Yes</Chip>
              <Chip active={sectorAnswers[q.id] === 'No'} onClick={() => updateSectorAnswer(q.id, 'No')}>No</Chip>
            </>)}
            {q.type === 'select' && q.options.map(o => <Chip key={o} active={sectorAnswers[q.id] === o} onClick={() => updateSectorAnswer(q.id, o)}>{o}</Chip>)}
            {(q.type === 'text' || q.type === 'number') && (
              <TInput type={q.type === 'number' ? 'number' : 'text'} inputMode={q.type === 'number' ? 'numeric' : undefined} value={sectorAnswers[q.id] || ''} onChange={e => updateSectorAnswer(q.id, e.target.value)} placeholder={q.placeholder} style={{ maxWidth: q.type === 'number' ? '160px' : '100%' }} />
            )}
          </Field>
        ))}
        <NavRow onBack={() => setStep(5)} onNext={() => setStep(7)} />
      </div>
    );
  } else if (step === 7) {
    body = (
      <div>
        <ProgressBar step={7} total={13} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: INK }}>Monthly business expenses</h2>
        <p className="text-sm mb-5" style={{ color: MUTED }}>Add every regular cost — pick a suggested head or add your own, at any frequency.</p>
        {expenses.map((e) => (
          <div key={e.id} className="rounded-lg border p-4 mb-3" style={{ borderColor: LINE }}>
            <div className="grid grid-cols-3 gap-2 items-start">
              <MiniField label="Expense head">
                <Select value={e.head} onChange={ev => updateExpense(e.id, 'head', ev.target.value)} options={[...(EXPENSE_HEADS_BY_SECTOR[sector] || []), ...EXPENSE_HEADS_COMMON, '__custom']} placeholder="Select…" />
                {e.head === '__custom' && <TInput className="mt-1" value={e.customHead} onChange={ev => updateExpense(e.id, 'customHead', ev.target.value)} placeholder="Type expense name" />}
              </MiniField>
              <MiniField label="Amount (₹)"><TInput type="number" inputMode="numeric" value={e.amount} onChange={ev => updateExpense(e.id, 'amount', ev.target.value)} /></MiniField>
              <MiniField label="Frequency"><Select value={e.frequency} onChange={ev => updateExpense(e.id, 'frequency', ev.target.value)} options={FREQUENCIES} /></MiniField>
            </div>
            <button type="button" onClick={() => removeExpense(e.id)} className="text-xs mt-3 inline-flex items-center gap-1" style={{ color: WARN }}><Trash2 size={13} /> Remove</button>
          </div>
        ))}
        <button type="button" onClick={addExpense} className="inline-flex items-center gap-1.5 text-sm font-medium mb-5" style={{ color: PRIMARY }}>
          <Plus size={16} /> Add expense
        </button>
        <SectionCard>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <KV label="Total monthly expenses (calculated)" value={fmt(calc.totalOpexMonthly)} />
            <KV label="Monthly operating profit (calculated)" value={fmt(calc.netOperatingProfit)} />
          </div>
        </SectionCard>
        {calc.revenueDiffPct !== null && calc.revenueDiffPct > 15 && (
          <div className="rounded-lg p-4 mb-4 flex gap-3" style={{ background: WARN_SOFT }}>
            <AlertTriangle size={18} color="#a16207" className="shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: '#7a5c0a' }}>Her stated current turnover doesn't quite match what the products calculate to — worth double-checking with her.</div>
          </div>
        )}
        <NavRow onBack={() => setStep(6)} onNext={() => setStep(8)} />
      </div>
    );
  } else if (step === 8) {
    body = (
      <div>
        <ProgressBar step={8} total={13} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: INK }}>What does she need the loan for?</h2>
        <p className="text-sm mb-5" style={{ color: MUTED }}>Machinery, equipment or stock — add one row per item.</p>
        <div className="mb-4">
          {machinery.map((m, i) => (
            <div key={m.id} className="flex gap-2 mb-2 items-center">
              <TInput value={m.name} onChange={e => updateMachineryItem(m.id, 'name', e.target.value)} placeholder={'Item ' + (i + 1) + ' — e.g. Dough kneader'} />
              <TInput type="number" inputMode="numeric" value={m.cost} onChange={e => updateMachineryItem(m.id, 'cost', e.target.value)} placeholder="₹ cost" style={{ maxWidth: '140px' }} />
              <button type="button" onClick={() => removeMachineryItem(m.id)} className="p-2.5 rounded-lg" style={{ color: WARN }}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={addMachineryItem} className="inline-flex items-center gap-1.5 text-sm font-medium mt-1" style={{ color: PRIMARY }}>
            <Plus size={16} /> Add another item
          </button>
        </div>
        <Field icon={FileText} label="Other one-time setup costs (₹)" hint="Registration, licence, branding, etc.">
          <TInput type="number" inputMode="numeric" value={formData.otherSetupCost} onChange={e => update('otherSetupCost', e.target.value)} style={{ maxWidth: '200px' }} />
        </Field>
        <Field icon={PiggyBank} label="How much can she contribute herself? (₹)">
          <TInput type="number" inputMode="numeric" value={formData.ownContribution} onChange={e => update('ownContribution', e.target.value)} style={{ maxWidth: '200px' }} />
        </Field>
        <SectionCard>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <KV label="Total project cost (calculated)" value={fmt(calc.totalProjectCost)} />
            <KV label="Loan required (calculated)" value={fmt(calc.loanRequired)} />
          </div>
        </SectionCard>
        <NavRow onBack={() => setStep(7)} onNext={() => setStep(9)} />
      </div>
    );
  } else if (step === 9) {
    const dscrColor = calc.dscr === null ? MUTED : calc.dscr >= 1.5 ? PRIMARY : calc.dscr >= 1 ? '#a16207' : WARN;
    body = (
      <div>
        <ProgressBar step={9} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Loan terms</h2>
        <Field icon={Calendar} label="Preferred tenure (months)">
          <TInput type="number" inputMode="numeric" value={formData.tenure} onChange={e => update('tenure', e.target.value)} style={{ maxWidth: '140px' }} />
        </Field>
        <Field icon={Percent} label="Interest rate (% per year)">
          <TInput type="number" inputMode="numeric" value={formData.interestRate} onChange={e => update('interestRate', e.target.value)} style={{ maxWidth: '140px' }} />
        </Field>
        <Field icon={Calendar} label="Moratorium (months)">
          <TInput type="number" inputMode="numeric" value={formData.moratorium} onChange={e => update('moratorium', e.target.value)} style={{ maxWidth: '140px' }} />
        </Field>
        <Field icon={Banknote} label="Loan amount requested by entrepreneur, if different (₹)" hint="Optional — leave blank to use the calculated figure.">
          <TInput type="number" inputMode="numeric" value={formData.requestedLoanAmount} onChange={e => update('requestedLoanAmount', e.target.value)} style={{ maxWidth: '200px' }} />
        </Field>
        <SectionCard>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <KV label="Monthly EMI (calculated)" value={fmt(calc.emi)} />
            <span style={{ color: PRIMARY }}>Indicative repayment coverage (DSCR)</span><span className="text-right font-semibold" style={{ color: dscrColor }}>{calc.dscr ? calc.dscr.toFixed(2) + '×' : '—'}</span>
          </div>
        </SectionCard>
        <NavRow onBack={() => setStep(8)} onNext={() => setStep(10)} />
      </div>
    );
  } else if (step === 10) {
    body = (
      <div>
        <ProgressBar step={10} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Future plan</h2>
        <Field icon={Target} label="What does she want to do next? (select all that apply)">
          {GOALS_LIST.map(g => <Chip key={g} active={futurePlan.goals.includes(g)} onClick={() => toggleGoal(g)}>{g}</Chip>)}
        </Field>
        <Field icon={Rocket} label="What is the main goal of the proposed loan?">
          <TInput value={futurePlan.loanGoal} onChange={e => setFuturePlan(f => ({ ...f, loanGoal: e.target.value }))} />
        </Field>
        <Field icon={ListChecks} label="In 3 years, where does she want this business to be?">
          <TInput value={futurePlan.threeYearVision} onChange={e => setFuturePlan(f => ({ ...f, threeYearVision: e.target.value }))} />
        </Field>
        <NavRow onBack={() => setStep(9)} onNext={() => setStep(11)} />
      </div>
    );
  } else if (step === 11) {
    body = (
      <div>
        <ProgressBar step={11} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Marketing & sales</h2>
        <Field icon={Users} label="Who are her target customers?">
          <TInput value={marketing.targetCustomers} onChange={e => setMarketing(m => ({ ...m, targetCustomers: e.target.value }))} />
        </Field>
        <Field icon={Megaphone} label="How does she currently sell? (select all that apply)">
          {CHANNELS.map(c => <Chip key={c} active={marketing.currentChannels.includes(c)} onClick={() => toggleChannel('currentChannels', c)}>{c}</Chip>)}
        </Field>
        <Field icon={Rocket} label="Where would she like to sell in future?">
          {CHANNELS.map(c => <Chip key={c} active={marketing.proposedChannels.includes(c)} onClick={() => toggleChannel('proposedChannels', c)}>{c}</Chip>)}
        </Field>
        <Field icon={TrendingUp} label="What's her pricing approach?">
          {PRICING_STRATEGIES.map(p => <Chip key={p} active={marketing.pricingStrategy === p} onClick={() => setMarketing(m => ({ ...m, pricingStrategy: p }))}>{p}</Chip>)}
        </Field>
        <Field icon={ShieldCheck} label="What makes her better than nearby competitors?">
          <TInput value={marketing.competitiveAdvantage} onChange={e => setMarketing(m => ({ ...m, competitiveAdvantage: e.target.value }))} />
        </Field>
        <NavRow onBack={() => setStep(10)} onNext={() => setStep(12)} />
      </div>
    );
  } else if (step === 12) {
    body = (
      <div>
        <ProgressBar step={12} total={13} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: INK }}>3-year growth assumptions</h2>
        <p className="text-sm mb-4" style={{ color: MUTED }}>System-suggested, based on her answers so far — review and adjust before approving.</p>
        <div className="rounded-lg border p-4 mb-4" style={{ borderColor: LINE }}>
          <div className="text-xs uppercase tracking-wide mb-2" style={{ color: MUTED }}>Why these numbers</div>
          <ul className="text-sm space-y-1" style={{ color: '#3c473f' }}>
            {suggested.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
        {['y1', 'y2', 'y3'].map((k, i) => (
          <Field key={k} icon={TrendingUp} label={'Year ' + (i + 1) + ' revenue growth (%)'} hint={'System suggested: ' + suggested[k] + '%'}>
            <TInput type="number" inputMode="numeric" value={effectiveAssumptions[k]} onChange={e => setAssumptions({ ...effectiveAssumptions, [k]: e.target.value })} style={{ maxWidth: '140px' }} />
          </Field>
        ))}
        <label className="flex items-start gap-2 mb-6 text-sm cursor-pointer" style={{ color: INK }}>
          <input type="checkbox" checked={assumptionsApproved} className="mt-1" onChange={e => {
            const checked = e.target.checked;
            setAssumptionsApproved(checked);
            if (checked) setAssumptions({ y1: effectiveAssumptions.y1, y2: effectiveAssumptions.y2, y3: effectiveAssumptions.y3 });
          }} />
          <span>DSK operator has reviewed and approved these growth assumptions.</span>
        </label>
        <NavRow onBack={() => setStep(11)} onNext={() => setStep(13)} nextDisabled={!assumptionsApproved} />
      </div>
    );
  } else if (step === 13) {
    body = (
      <div>
        <ProgressBar step={13} total={13} />
        <h2 className="text-xl font-semibold mb-5" style={{ color: INK }}>Review before generating</h2>
        <div className="rounded-xl border p-5 mb-4" style={{ borderColor: LINE }}>
          <div className="font-semibold mb-3" style={{ color: INK }}>{formData.name || 'Entrepreneur'} · {sectorCfg.name}</div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span style={{ color: MUTED }}>Monthly revenue</span><span className="text-right font-medium">{fmt(calc.totalRevenue)}</span>
            <span style={{ color: MUTED }}>Monthly expenses</span><span className="text-right font-medium">{fmt(calc.totalOpexMonthly)}</span>
            <span style={{ color: MUTED }}>Monthly operating profit</span><span className="text-right font-medium">{fmt(calc.netOperatingProfit)}</span>
            <span style={{ color: MUTED }}>Loan required</span><span className="text-right font-medium">{fmt(calc.loanRequired)}</span>
            <span style={{ color: MUTED }}>EMI</span><span className="text-right font-medium">{fmt(calc.emi)}</span>
            <span style={{ color: MUTED }}>Indicative DSCR</span><span className="text-right font-medium">{calc.dscr ? calc.dscr.toFixed(2) + '×' : '—'}</span>
            <span style={{ color: MUTED }}>Year 3 revenue (approved)</span><span className="text-right font-medium">{fmt(calc.projection[2].revenue)}</span>
          </div>
        </div>
        {calc.validations.length > 0 && (
          <div className="rounded-lg p-4 mb-4" style={{ background: WARN_SOFT }}>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: '#7a5c0a' }}><AlertTriangle size={16} /> {calc.validations.length} thing{calc.validations.length > 1 ? 's' : ''} worth reviewing</div>
            <ul className="text-sm space-y-1" style={{ color: '#7a5c0a' }}>
              {calc.validations.map((v, i) => <li key={i}>• {v}</li>)}
            </ul>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <button type="button" onClick={() => setStep(12)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium" style={{ color: MUTED }}>
            <ArrowLeft size={16} /> Back
          </button>
          <button type="button" onClick={generatePlan} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium" style={{ background: ACCENT, color: INK }}>
            <Sparkles size={16} /> Generate Business Plan
          </button>
        </div>
      </div>
    );
  } else if (step === 14) {
    body = (
      <div className="text-center py-20">
        <Loader2 size={32} color={PRIMARY} className="mx-auto mb-4 animate-spin" />
        <p style={{ color: MUTED }}>Writing the business plan for {formData.name || 'this entrepreneur'}'s {sectorCfg.name.toLowerCase()} business…</p>
      </div>
    );
  } else if (step === 15) {
    const bp = businessPlan || {};
    body = (
      <div>
        <div className="no-print flex items-center justify-between mb-6">
          <button type="button" onClick={() => setStep(13)} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: MUTED }}>
            <ArrowLeft size={16} /> Back to review
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border" style={{ borderColor: LINE, color: INK }}>
              <Printer size={15} /> Print
            </button>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium" style={{ background: PRIMARY, color: '#fff' }}>
              <RotateCcw size={15} /> New entrepreneur
            </button>
          </div>
        </div>

        <div className="rounded-xl border p-6 mb-4" style={{ borderColor: LINE }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>Business Plan / DPR — Draft</div>
          <h2 className="dsk-display text-2xl mb-1" style={{ color: INK, fontWeight: 600 }}>{formData.name || 'Entrepreneur'}</h2>
          <p className="text-sm mb-5" style={{ color: MUTED }}>{sectorCfg.name} · {[location.village, location.mandal, location.district, location.state].filter(Boolean).join(', ') || 'Location not given'}</p>

          {(genError || genErrorB) && (
            <div className="rounded-lg p-4 mb-5 flex gap-3" style={{ background: WARN_SOFT }}>
              <AlertTriangle size={18} color="#a16207" className="shrink-0 mt-0.5" />
              <div className="text-sm" style={{ color: '#7a5c0a' }}>{genError}{genError && genErrorB ? ' ' : ''}{genErrorB}</div>
            </div>
          )}

          {bp.executiveSummary && (<Section title="Executive Summary" text={bp.executiveSummary} />)}
          {bp.businessDescription && (<Section title="Business Overview" text={bp.businessDescription} />)}

          <h3 className="font-semibold mb-2 mt-1" style={{ color: INK }}>Entrepreneur Profile & Location</h3>
          <SectionCard>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <KV label="Name" value={formData.name || '—'} />
              <KV label="Education" value={formData.education || '—'} />
              <KV label="Social category" value={formData.socialCategory || '—'} />
              <KV label="Household income" value={fmt(formData.familyIncome)} />
              <KV label="Village / District / State" value={[location.village, location.district, location.state].filter(Boolean).join(', ') || '—'} />
            </div>
          </SectionCard>

          <h3 className="font-semibold mb-2" style={{ color: INK }}>Product Portfolio & Costing</h3>
          {calc.productRows.filter(p => p.qty).map(p => (
            <div key={p.id} className="text-sm flex justify-between py-1.5 border-b" style={{ borderColor: LINE }}>
              <span style={{ color: INK }}>{p.name || 'Product'} ({p.qty} {p.unit}/mo @ {fmt(p.sellingPrice)})</span>
              <span style={{ color: PRIMARY }}>{fmt(p.revenue)}/mo · {p.marginPct.toFixed(0)}% margin</span>
            </div>
          ))}

          <h3 className="font-semibold mb-2 mt-4" style={{ color: INK }}>Financial Snapshot <span className="text-xs font-normal" style={{ color: MUTED }}>(calculated, not AI-generated)</span></h3>
          <SectionCard>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <KV label="Monthly revenue" value={fmt(calc.totalRevenue)} />
              <KV label="Monthly direct cost" value={fmt(calc.totalDirectCost)} />
              <KV label="Monthly expenses" value={fmt(calc.totalOpexMonthly)} />
              <KV label="Monthly operating profit" value={fmt(calc.netOperatingProfit)} />
              <KV label="Gross margin" value={calc.grossMarginPct.toFixed(0) + '%'} />
              {calc.breakEvenQty !== null && <KV label="Break-even" value={'~' + calc.breakEvenQty + ' units/month'} />}
            </div>
          </SectionCard>

          <h3 className="font-semibold mb-2" style={{ color: INK }}>Expense Structure</h3>
          {calc.expenseRows.length > 0 ? calc.expenseRows.map(e => (
            <div key={e.id} className="text-sm flex justify-between py-1.5 border-b" style={{ borderColor: LINE }}>
              <span style={{ color: INK }}>{e.displayHead || 'Expense'} ({e.frequency})</span>
              <span style={{ color: PRIMARY }}>{fmt(e.monthly)}/mo</span>
            </div>
          )) : <p className="text-sm" style={{ color: MUTED }}>None captured.</p>}

          <h3 className="font-semibold mb-2 mt-4" style={{ color: INK }}>Investment & Loan</h3>
          <SectionCard>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <KV label="Total project cost" value={fmt(calc.totalProjectCost)} />
              <KV label="Own contribution" value={fmt(calc.ownContribution)} />
              <KV label="Loan required" value={fmt(calc.loanRequired)} />
              <KV label="Tenure / Rate" value={formData.tenure + ' mo · ' + formData.interestRate + '%'} />
              <KV label="EMI" value={fmt(calc.emi)} />
              <KV label="Indicative DSCR" value={calc.dscr ? calc.dscr.toFixed(2) + '×' : '—'} />
            </div>
          </SectionCard>

          <h3 className="font-semibold mb-2" style={{ color: INK }}>3-Year Financial Projection <span className="text-xs font-normal" style={{ color: MUTED }}>(calculated — assumptions DSK-operator approved)</span></h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs" style={{ color: INK }}>
              <thead><tr style={{ color: MUTED }}><td className="py-1">Year</td><td className="text-right">Growth</td><td className="text-right">Revenue</td><td className="text-right">Opex</td><td className="text-right">Net Profit</td><td className="text-right">Margin</td></tr></thead>
              <tbody>
                {calc.projection.map(r => (
                  <tr key={r.year} className="border-t" style={{ borderColor: LINE }}>
                    <td className="py-1.5">Year {r.year}</td>
                    <td className="text-right">{r.growthPct}%</td>
                    <td className="text-right">{fmt(r.revenue)}</td>
                    <td className="text-right">{fmt(r.opex)}</td>
                    <td className="text-right">{fmt(r.netProfit)}</td>
                    <td className="text-right">{r.netMarginPct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bp.marketAnalysis && <Section title="Market & Customers" text={bp.marketAnalysis} />}
          {bp.marketingPlan && <Section title="Marketing Plan" text={bp.marketingPlan} />}

          {bp.swot && (
            <>
              <h3 className="font-semibold mb-2" style={{ color: INK }}>SWOT Analysis</h3>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <SwotBox title="Strengths" items={bp.swot.strengths} color={PRIMARY} />
                <SwotBox title="Weaknesses" items={bp.swot.weaknesses} color="#a16207" />
                <SwotBox title="Opportunities" items={bp.swot.opportunities} color="#2563eb" />
                <SwotBox title="Threats" items={bp.swot.threats} color={WARN} />
              </div>
            </>
          )}

          {bp.futureGrowthPlan && (
            <>
              <h3 className="font-semibold mb-2" style={{ color: INK }}>Future Growth Plan</h3>
              <SectionCard>
                <p className="text-sm mb-1.5" style={{ color: PRIMARY }}><b>Year 1:</b> {bp.futureGrowthPlan.year1}</p>
                <p className="text-sm mb-1.5" style={{ color: PRIMARY }}><b>Year 2:</b> {bp.futureGrowthPlan.year2}</p>
                <p className="text-sm" style={{ color: PRIMARY }}><b>Year 3:</b> {bp.futureGrowthPlan.year3}</p>
              </SectionCard>
            </>
          )}

          {bp.risksAndMitigation && <Section title="Risks & Mitigation" text={bp.risksAndMitigation} />}

          {calc.validations.length > 0 && (
            <>
              <h3 className="font-semibold mb-2" style={{ color: INK }}>Data Quality Flags</h3>
              <div className="rounded-lg p-4 mb-5" style={{ background: WARN_SOFT }}>
                <ul className="text-sm space-y-1" style={{ color: '#7a5c0a' }}>{calc.validations.map((v, i) => <li key={i}>• {v}</li>)}</ul>
              </div>
            </>
          )}

          {bp.conclusion && <Section title="Conclusion & Funding Requirement" text={bp.conclusion} />}
        </div>
        <p className="text-xs text-center" style={{ color: '#93a199' }}>Draft for DSK operator review — not yet approved for submission.</p>
      </div>
    );
  }

  return (
    <div className="dsk-app w-full" style={{ background: '#F5F6F0', minHeight: '640px' }}>
      {fonts}
      <div className="max-w-xl mx-auto px-4 py-8">
        {step > 0 && step < 14 && (
          <div className="no-print flex items-center gap-2 mb-6 text-xs" style={{ color: MUTED }}>
            <Building2 size={14} /> Access Livelihoods · Digital Seva Kendra
          </div>
        )}
        {body}
      </div>
    </div>
  );
}

function Section({ title, text }) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold mb-1.5" style={{ color: INK }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#3c473f' }}>{text}</p>
    </div>
  );
}
function SwotBox({ title, items }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: LINE }}>
      <div className="text-xs font-semibold mb-1.5" style={{ color: INK }}>{title}</div>
      <ul className="text-xs space-y-1" style={{ color: '#3c473f' }}>
        {(items || []).map((it, i) => <li key={i}>• {it}</li>)}
      </ul>
    </div>
  );
}
