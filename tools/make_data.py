import json,re,sys
src='/mnt/project-files/gis-db/gis_master_database.json'
o=json.load(open(src))
G=[('Hospital / healthcare',r'hospital|clinic|medical|health|trauma'),('Emergency / public safety',r'emergency|police|fire|eoc|command|operations'),
   ('Data centre / telecom',r'data|computer|telecom|telecommunication'),('Education',r'school|universi|educat|college|kindergarten|library|student|campus'),
   ('Government / civic',r'gover|city hall|court|parliament|admin|civic|state house|public|municipal|jail|navy|military'),
   ('Residential',r'residen|retire|apartment|condo|house|dormitor|housing|mansion|hotel'),('Office / commercial',r'office|commercial|headquarter|retail|shopping|bank|company'),
   ('Cultural / religious / assembly',r'museum|church|cathedral|basilica|temple|mosque|shrine|tomb|religio|convention|congress|expo|pool|recreation|gallery|theatre|auditorium|art|tower|stadium|sport|gymnas'),
   ('Research / laboratory',r'laborator|research|observator|test|r&d|technical'),('Industrial / energy / transport',r'station|printing|lng|tank|boiler|power|industr|factory|plant|dam|valve|warehouse|airport|hangar|port|infrastructure|logistic')]
def grp(b):
    if b['structure_class']=='bridge': return 'Bridge'
    t=(b.get('use') or '').lower()
    for g,p in G:
        if re.search(p,t): return g
    t=b['name'].lower()
    for g,p in G:
        if re.search(p,t): return g
    return 'Other'
out=[]
for b in o:
    out.append({k:v for k,v in dict(id=b['id'],c=b['country'],n=b['name'],loc=b.get('location') or '',lat=b.get('lat') or None,lng=b.get('lng') or None,
      gp=b.get('geo_precision') or '',gm=b.get('geo_match') or '',cls=b['structure_class'],use=b.get('use') or '',ug=grp(b),nr=b.get('new_retrofit') or '',
      y=b.get('year') or None,yn=b.get('year_note') or '',st=b.get('stories_text') or '',a=b.get('area_m2') or None,
      nb=b.get('n_bldgs') or '',beds=b.get('beds') or '',fam=b.get('isolation_family') or '',dev=b.get('devices') or '',dmp=b.get('supplemental_damping')=='yes',
      cnt=b.get('device_counts') or '',ni=b.get('n_isolators') or None,raw=b.get('isolators_raw') or '',inote=b.get('isolators_note') or '',
      unc=b.get('isolators_uncertain')=='yes',ref=b.get('references') or '').items() if v not in ('',None,False)})
import collections
print(collections.Counter(x['ug'] for x in out),file=sys.stderr)
open(sys.argv[1],'w').write('// Generated from database/gis_master_database.json. Publish-tier fields only (no engineer, architect, manufacturer).\nwindow.GIS_BUILDINGS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
