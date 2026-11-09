#!/usr/bin/env python3
"""
Generates 002_seed_sectors.sql and ../04_config/sectors.json from the single SECTORS table below.
To add an industry: add one entry here, re-run, apply the new SQL (or insert rows via the admin screen).
Usage: python3 gen_seed.py
"""
import json, pathlib

HERE = pathlib.Path(__file__).parent

# (key, label, icon, type, options|None, placeholder|None, stage|None)   stage: 'existing' | 'new' | None (both)
SECTORS = [
 ("dairy","Dairy","Milk","#2563eb","litre",[
   ("animals","How many milking animals does she have?","PawPrint","number",None,None,None),
   ("buyer","Who does she mainly sell to?","Landmark","select",["Cooperative","Collection centre","Retail customers","Other"],None,None),
   ("vet","Is veterinary support available?","ShieldCheck","yesno",None,None,None),
   ("shed","Is a shed available?","Home","yesno",None,None,None),
   ("lactation","Average milk yield per animal per day (litres)","Droplets","number",None,None,"existing")]),
 ("poultry","Poultry","Egg","#d97706","bird / egg",[
   ("birdType","Bird type","Egg","select",["Layer","Broiler","Backyard / country"],None,None),
   ("birds","Number of birds","PawPrint","number",None,None,None),
   ("vaccination","Is vaccination support available?","ShieldCheck","yesno",None,None,None),
   ("buyer","Main buyer / market channel","Landmark","text",None,None,None),
   ("cycles","Batches / cycles per year","Calendar","number",None,None,None)]),
 ("goatery","Goat & Sheep Rearing","PawPrint","#7c3aed","animal",[
   ("breed","Breed","PawPrint","text",None,None,None),
   ("animals","Number of animals","PawPrint","number",None,None,None),
   ("grazing","Is grazing land available?","Sprout","yesno",None,None,None),
   ("vet","Is veterinary support available?","ShieldCheck","yesno",None,None,None)]),
 ("fisheries","Fisheries","Fish","#0891b2","kg",[
   ("species","Species cultured","Fish","text",None,None,None),
   ("pondArea","Pond / tank area","Home","text",None,"e.g. 0.5 acre",None),
   ("waterYearRound","Is water available year-round?","Waves","yesno",None,None,None),
   ("cycles","Production cycles per year","Calendar","number",None,None,None)]),
 ("tailoring","Tailoring & Garments","Scissors","#db2777","order",[
   ("machines","Number of sewing machines","Scissors","number",None,None,None),
   ("custom","Custom-made or ready-made?","FileText","select",["Custom-made","Ready-made","Both"],None,None),
   ("segment","Main customer segment","Users","text",None,None,None),
   ("seasonal","Does demand change by season (e.g. weddings)?","TrendingUp","yesno",None,None,None),
   ("fabricSource","Where does she buy fabric?","Package","text",None,None,None)]),
 ("grocery","Retail / Grocery / Kirana","Store","#65a30d","item",[
   ("ownership","Shop ownership","Home","select",["Owned","Rented"],None,None),
   ("supplier","Main supplier source","Package","text",None,None,None),
   ("credit","Does she give customers credit?","Banknote","yesno",None,None,None),
   ("turnoverDays","Approx. stock turnover (days)","Calendar","number",None,None,None),
   ("footfall","Customers per day (approx.)","Users","number",None,None,"existing")]),
 ("foodprocessing","Food Processing","Factory","#ea580c","unit",[
   ("fssai","Does she have FSSAI registration?","ShieldCheck","yesno",None,None,None),
   ("shelfLife","Shelf life of product","Calendar","text",None,"e.g. 3 months",None),
   ("seasonal","Does demand change by season?","TrendingUp","yesno",None,None,None),
   ("rawSource","Where does she source raw material from?","Package","text",None,None,None),
   ("packaging","How is the product packaged?","Package","text",None,None,None)]),
 ("catering","Catering / Tiffin","UtensilsCrossed","#c2410c","order",[
   ("serviceType","Type of food service","UtensilsCrossed","select",["Tiffin service","Catering","Tea stall","Snack centre"],None,None),
   ("kitchen","Is a kitchen / workspace available?","Home","yesno",None,None,None),
   ("fssai","Is FSSAI / local licence available?","ShieldCheck","yesno",None,None,None),
   ("customerBase","Main customer base","Users","text",None,None,None)]),
 ("mobilerepair","Mobile Repair / CSC","Smartphone","#4338ca","service",[
   ("services","Main services offered","Wrench","text",None,None,None),
   ("tools","Are tools / equipment available?","Wrench","yesno",None,None,None),
   ("spares","Is a regular spares supplier available?","Package","yesno",None,None,None),
   ("competition","Any competitor nearby?","AlertTriangle","yesno",None,None,None)]),
 ("handicrafts","Agarbatti / Handicrafts","Palette","#a16207","unit",[
   ("product","Product made","Palette","text",None,None,None),
   ("workspace","Is workspace available?","Home","yesno",None,None,None),
   ("buyer","Main buyer / market channel","Landmark","text",None,None,None),
   ("seasonal","Does demand change by season (festivals)?","TrendingUp","yesno",None,None,None)]),
 ("vegetable","Vegetable Vending","Sprout","#16a34a","kg",[
   ("produce","Main produce sold","Sprout","text",None,None,None),
   ("sellingUnit","Type of selling unit","Store","select",["Push cart","Roadside stall","Shop","Mobile van"],None,None),
   ("storage","Is storage / cold facility available?","Snowflake","yesno",None,None,None),
   ("procurement","Main procurement source","Package","text",None,None,None)]),
 ("beauty","Beauty Parlour & Salon","Sparkles","#be185d","service",[
   ("services","Main services offered","Sparkles","text",None,None,None),
   ("chairs","Number of service chairs / stations","Home","number",None,None,None),
   ("training","Has she received training / certification?","GraduationCap","yesno",None,None,None),
   ("seasonal","Does demand change by season (weddings/festivals)?","TrendingUp","yesno",None,None,None)]),
 # ---- extra industries (not in the prototype) ----
 ("bakery","Bakery & Sweets","Cake","#b45309","unit",[
   ("oven","What type of oven / equipment does she use?","Flame","text",None,None,None),
   ("fssai","Does she have FSSAI registration?","ShieldCheck","yesno",None,None,None),
   ("shelfLife","Shelf life of products","Calendar","text",None,None,None),
   ("seasonal","Does demand change by season (festivals)?","TrendingUp","yesno",None,None,None)]),
 ("handloom","Handloom & Weaving","Grid3x3","#9333ea","piece",[
   ("looms","Number of looms","Grid3x3","number",None,None,None),
   ("yarnSource","Where does she buy yarn?","Package","text",None,None,None),
   ("buyer","Main buyer (society / master weaver / direct)","Landmark","text",None,None,None),
   ("seasonal","Does demand change by season?","TrendingUp","yesno",None,None,None)]),
 ("nursery","Nursery / Agri-inputs","Flower2","#15803d","plant",[
   ("area","Land / shade-net area","Home","text",None,None,None),
   ("water","Is irrigation water available year-round?","Waves","yesno",None,None,None),
   ("cycle","Production cycle (months)","Calendar","number",None,None,None),
   ("seasonal","Does demand peak in a particular season?","TrendingUp","yesno",None,None,None)]),
 ("flourmill","Flour Mill / Oil Ghani","Wheat","#ca8a04","kg",[
   ("machine","Machine type and capacity (kg/hour)","Factory","text",None,None,None),
   ("power","Is three-phase power available?","Zap","yesno",None,None,None),
   ("service","Own produce, custom milling, or both?","FileText","select",["Own produce","Custom milling","Both"],None,None),
   ("fssai","Does she have FSSAI registration?","ShieldCheck","yesno",None,None,None)]),
 ("laundry","Laundry & Ironing","Shirt","#0ea5e9","piece",[
   ("equipment","Equipment available (iron, washing machine, etc.)","Wrench","text",None,None,None),
   ("customers","Regular customers (households / hostels / shops)","Users","text",None,None,None),
   ("pickup","Does she offer pickup and delivery?","Truck","yesno",None,None,None)]),
 ("stationery","Stationery / Xerox / Printing","Printer","#475569","job",[
   ("machines","Machines available (xerox, printer, etc.)","Printer","text",None,None,None),
   ("location","Is the shop near a school, college or office?","MapPin","yesno",None,None,None),
   ("ownership","Shop ownership","Home","select",["Owned","Rented"],None,None)]),
]

COMMON_HEADS = [
 ("Rent","operating"),("Electricity","operating"),("Water","operating"),("Gas / Fuel","operating"),
 ("Transportation","operating"),("Labour / Wages","operating"),("Salaries","operating"),
 ("Repairs & Maintenance","operating"),("Equipment maintenance","operating"),("Communication / Internet","operating"),
 ("Marketing & Promotion","operating"),("Packaging","operating"),("Delivery / Logistics","operating"),
 ("Shop / Stall expenses","operating"),("Storage","operating"),("Insurance","operating"),
 ("Licenses / Registrations","operating"),("Professional services","operating"),("Miscellaneous","operating"),
 ("Interest on existing loans","finance"),("Other financial obligations","finance"),
]
# Existing-loan EMI is captured on the loan screen (it feeds DSCR), not as an expense row.

SECTOR_HEADS = {
 "dairy":[("Feed & fodder","direct"),("Veterinary care","direct")],
 "poultry":[("Feed","direct"),("Vaccination & medicine","direct"),("Chicks / day-old birds","direct")],
 "goatery":[("Feed & fodder","direct"),("Veterinary care","direct")],
 "fisheries":[("Feed","direct"),("Seed / fingerlings","direct"),("Pond maintenance","operating")],
 "tailoring":[("Fabric","direct"),("Thread, buttons & accessories","direct"),("Machine maintenance","operating")],
 "grocery":[("Stock purchase","direct")],
 "foodprocessing":[("Raw materials","direct"),("Packaging materials","direct"),("FSSAI / testing fees","operating")],
 "catering":[("Raw materials / ingredients","direct"),("Packaging / disposables","direct")],
 "mobilerepair":[("Spare parts / consumables","direct")],
 "handicrafts":[("Raw materials","direct")],
 "vegetable":[("Procurement cost","direct"),("Market / mandi fees","operating")],
 "beauty":[("Consumables / cosmetics","direct")],
 "bakery":[("Flour, sugar & ingredients","direct"),("Packaging materials","direct")],
 "handloom":[("Yarn","direct"),("Dyes & chemicals","direct")],
 "nursery":[("Seeds / saplings","direct"),("Soil, pots & polybags","direct"),("Fertiliser & pesticide","direct")],
 "flourmill":[("Grain / seed purchase","direct"),("Machine wear parts","operating")],
 "laundry":[("Detergent & chemicals","direct")],
 "stationery":[("Paper, toner & ink","direct")],
}

def q(s):  # SQL string literal
    return "'" + str(s).replace("'", "''") + "'"

lines = ["-- GENERATED by gen_seed.py — do not hand-edit; edit gen_seed.py and re-run.", "begin;"]
for i,(sid,name,icon,tint,unit,_) in enumerate(SECTORS):
    lines.append(f"insert into sectors (id,name,icon,tint,default_unit,sort_order) values ({q(sid)},{q(name)},{q(icon)},{q(tint)},{q(unit)},{i}) on conflict (id) do update set name=excluded.name, icon=excluded.icon, tint=excluded.tint, default_unit=excluded.default_unit, sort_order=excluded.sort_order;")
lines.append("")
for sid,_,_,_,_,qs in SECTORS:
    for j,(key,label,icon,typ,opts,ph,stage) in enumerate(qs):
        lines.append(
          "insert into sector_questions (sector_id,key,label,icon,type,options,placeholder,stage,sort_order) values "
          f"({q(sid)},{q(key)},{q(label)},{q(icon)},{q(typ)},{q(json.dumps(opts)) + '::jsonb' if opts else 'null'},"
          f"{q(ph) if ph else 'null'},{q(stage) + '::business_stage' if stage else 'null'},{j}) "
          "on conflict (sector_id,key) do update set label=excluded.label, icon=excluded.icon, type=excluded.type, options=excluded.options, placeholder=excluded.placeholder, stage=excluded.stage, sort_order=excluded.sort_order;")
lines.append("")
lines.append("delete from expense_heads;")
for j,(name,cls) in enumerate(COMMON_HEADS):
    lines.append(f"insert into expense_heads (sector_id,name,class,sort_order) values (null,{q(name)},{q(cls)}::expense_class,{j});")
for sid,heads in SECTOR_HEADS.items():
    for j,(name,cls) in enumerate(heads):
        lines.append(f"insert into expense_heads (sector_id,name,class,sort_order) values ({q(sid)},{q(name)},{q(cls)}::expense_class,{j});")
lines.append("commit;")
(HERE / "002_seed_sectors.sql").write_text("\n".join(lines) + "\n")

out = {
  "sectors":[{"id":sid,"name":name,"icon":icon,"tint":tint,"defaultUnit":unit,
              "questions":[{"key":k,"label":l,"icon":ic,"type":t,"options":o,"placeholder":p,"stage":st} for (k,l,ic,t,o,p,st) in qs],
              "expenseHeads":[{"name":n,"class":c} for n,c in SECTOR_HEADS.get(sid,[])]}
             for sid,name,icon,tint,unit,qs in SECTORS],
  "commonExpenseHeads":[{"name":n,"class":c} for n,c in COMMON_HEADS],
}
cfg = HERE.parent / "04_config"; cfg.mkdir(exist_ok=True)
(cfg / "sectors.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(f"{len(SECTORS)} sectors, {sum(len(s[5]) for s in SECTORS)} questions, "
      f"{len(COMMON_HEADS)+sum(len(v) for v in SECTOR_HEADS.values())} expense heads")
