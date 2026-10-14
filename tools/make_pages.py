"""Builds the content pages (about, participate, learn, resources) with the shared header and footer.
Run from the new build folder: python tools/make_pages.py"""
import re
V = '3'
NAV = [('index.html', 'Buildings'), ('about.html', 'About'), ('participate.html', 'Participate'), ('learn.html', 'Learn'), ('resources.html', 'Resources')]
EMAIL = 'info@globalisolationsurvey.org'

def page(fname, title, desc, body):
    nav = '\n'.join(f'    <a{" class=\"on\"" if f == fname else ""} href="{f}">{t}</a>' for f, t in NAV)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title} | Global Isolation Survey</title>
<meta name="description" content="{desc}">
<link rel="stylesheet" href="css/site.css?v={V}">
</head>
<body>
<header class="top">
  <a class="brand" href="index.html"><img src="assets/gis-wordmark.png" alt="Global Isolation Survey"></a>
  <nav>
{nav}
  </nav>
</header>
<main class="page">
{body}
</main>
<footer class="foot">
  <span>© Global Isolation Survey. Information may be freely used with credit to the Global Isolation Survey.</span>
  <span><a href="mailto:{EMAIL}">{EMAIL}</a></span>
</footer>
</body>
</html>
'''

def todo(text):
    return f'<p class="todo">{text}</p>'

TEAM = [
    ('aiken', 'Dr. Ian Aiken, PE', 'Seismic Isolation Engineering, Inc.', 'Berkeley, California, USA'),
    ('aprile', 'Prof. Alessandra Aprile', 'University of Ferrara', 'Ferrara, Italy'),
    ('black', 'Dr. Cameron Black, PE', 'Seismic Isolation Engineering, Inc.', 'Berkeley, California, USA'),
    ('boroschek', 'Prof. Ruben Boroschek', 'University of Chile', 'Santiago, Chile'),
    ('kasalanati', 'Dr. Amarnath Kasalanati, PE', 'PEER Center, University of California, Berkeley', 'Berkeley, California, USA'),
    ('kikuchi', 'Prof. Masaru Kikuchi', 'Hokkaido University', 'Sapporo, Japan'),
    ('retamales', 'Dr. Rodrigo Retamales', 'Seismic Intelligence SpA', 'Santiago, Chile'),
    ('sadan', 'Dr. Bahadır Şadan', 'OBS Engineering Consulting Ltd.', 'Istanbul, Turkey'),
]
RESEARCH = [
    ('akyurt', 'Ömer Akyurt', 'SF State University', 'San Francisco, California, USA'),
    ('ozcanli', 'Kerim Efe Özcanlı', '', 'Reno, Nevada, USA'),
]
LOGOS = [('sie', 'Seismic Isolation Engineering, Inc.'), ('obs', 'OBS Earthquake Engineering Solutions'), ('si', 'Seismic Intelligence'),
         ('tasi', 'Turkish Association for Seismic Isolation'), ('hokkaido', 'Hokkaido University'),
         ('fcfm', 'Faculty of Physical and Mathematical Sciences, University of Chile'), ('ferrara', 'University of Ferrara')]

def people(lst):
    return '<div class="people">' + ''.join(
        f'<div class="person"><img src="assets/team/{k}.png" alt="{n}" loading="lazy"><b>{n}</b>'
        f'{f"<span>{o}</span>" if o else ""}<span class="mute">{p}</span></div>' for k, n, o, p in lst) + '</div>'

about = f'''<section class="hero-text">
  <h1>About the Global Isolation Survey</h1>
  <p class="lead">The Global Isolation Survey aims to foster the increased worldwide use of seismic isolation through the dissemination of knowledge about how seismic isolation is being utilized in different countries.</p>
</section>
<section class="block" id="mission">
  <h2>Mission</h2>
  <p>Our goal is to gather and freely share information about national and regional challenges and successes with the use of seismic isolation around the world.</p>
  <p>We are an international collaboration of design professionals and academics with decades of seismic isolation experience, in many cases experience that extends from the very beginnings of the use of the technology in our respective countries.</p>
</section>
<section class="block" id="team">
  <h2>Team</h2>
  <h3>Partners</h3>
  {people(TEAM)}
  <h3>Research team</h3>
  {people(RESEARCH)}
</section>
<section class="block" id="partners">
  <h2>Partner organizations</h2>
  <div class="logos">{''.join(f'<img src="assets/logos/{k}.png" alt="{n}" title="{n}" loading="lazy">' for k, n in LOGOS)}</div>
</section>
<section class="block" id="contact">
  <h2>Contact</h2>
  <p>For any inquiries please email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</section>'''

participate = f'''<section class="hero-text">
  <h1>Participate</h1>
  <p class="lead">We invite you to participate in the Global Isolation Survey. There are several ways to get involved.</p>
</section>
<section class="block" id="contribute">
  <h2>Contribute a building</h2>
  <p>The Global Isolation Survey is building an open database of seismic isolation projects around the world. We would like to know about your project. Please fill in one of the building data forms below and email it to us at <a href="mailto:{EMAIL}?subject=Building%20data%20form">{EMAIL}</a>.</p>
  <div class="cards2">
    <a class="doc" href="docs/building-data-form-simple.pdf" download><b>Building Data Form, simple</b><span class="mute">PDF · the essentials: name, location, year, stories, isolation system, number of bearings</span></a>
    <a class="doc" href="docs/building-data-form-detailed.pdf" download><b>Building Data Form, detailed</b><span class="mute">PDF · adds public or private use, new or retrofit, owner, engineer, architect, design features and references</span></a>
  </div>
  {todo('An online form is planned. A static site cannot receive submissions by itself, so this needs a form service; until then the PDF forms and email are used.')}
</section>
<section class="block" id="corrections">
  <h2>Corrections and photos</h2>
  <p>If you spot an error in the <a href="index.html">buildings database</a>, or have photos of an isolated building you are willing to share, please email <a href="mailto:{EMAIL}?subject=Database%20correction">{EMAIL}</a> with the building name and country.</p>
</section>
<section class="block" id="surveys">
  <h2>Surveys</h2>
  <p>We are conducting periodic national and regional surveys to gain insight into the factors influencing the adoption and use of seismic isolation around the world. We will be undertaking surveys in Italy, Japan, New Zealand, South America, Turkey and the U.S. in the near future. If you are interested in participating, please contact us at <a href="mailto:{EMAIL}?subject=Surveys">{EMAIL}</a>.</p>
</section>'''

FEATURED = [
    ('wellington-parliament', 'Parliament House', 'Wellington, New Zealand', 'NZ-005'),
    ('berkeley-hearst', 'Hearst Memorial Mining Building', 'University of California, Berkeley, USA', None),
    ('santiago-bahai', 'Santiago Baháʼí Temple', 'Santiago, Chile', None),
    ('laquila-case', 'Il Progetto C.A.S.E.', 'L’Aquila, Italy', 'IT-018'),
    ('ishinomaki-hospital', 'Ishinomaki Red Cross Hospital', 'Ishinomaki, Japan', None),
    ('istanbul-basaksehir', 'Başakşehir Çam & Sakura City Hospital', 'Istanbul, Turkey', 'TR-074'),
]
def feat(k, n, p, bid):
    inner = f'<img src="assets/photos/{k}.jpg" alt="{n}" loading="lazy"><b>{n}</b><span class="mute">{p}</span>'
    return f'<a class="feat" href="index.html#b={bid}">{inner}</a>' if bid else f'<div class="feat">{inner}</div>'

learn = f'''<section class="hero-text">
  <h1>Learn</h1>
  <p class="lead">Explore seismically isolated buildings around the world with our interactive database. View by country, isolation system, device, use or year.</p>
  <p><a class="btn" href="index.html">Open the buildings map and database</a></p>
</section>
<section class="block" id="featured">
  <h2>Featured isolated buildings</h2>
  <div class="feats">{''.join(feat(*f) for f in FEATURED)}</div>
</section>
<section class="block" id="surveys-underway">
  <h2>Surveys underway</h2>
  <p>National and regional surveys are planned for Italy, Japan, New Zealand, South America, Turkey and the U.S. See <a href="participate.html#surveys">Participate</a> to take part.</p>
  {todo('Status of each survey to be added.')}
</section>
<section class="block" id="survey-findings">
  <h2>Survey findings</h2>
  {todo('Findings will be published here as surveys are completed.')}
</section>'''

resources = f'''<section class="hero-text">
  <h1>Resources</h1>
  <p class="lead">General information about seismic isolation, including codes around the world, independent test laboratories, and articles and publications of interest.</p>
</section>
<section class="block" id="videos">
  <h2>Videos</h2>
  <div class="cards2">
    <a class="video" href="https://youtu.be/V7MD3fQXYx4" target="_blank" rel="noopener">
      <img src="assets/photos/ishinomaki-hospital.jpg" alt="Ishinomaki Red Cross Hospital" loading="lazy"><span class="play">▶</span>
      <b>Ishinomaki Red Cross Hospital, Great Tohoku Earthquake M9.0, March 11, 2011</b>
      <span class="mute">Inside the base-isolated hospital during and immediately after the earthquake and tsunami. 12:57, on YouTube.</span></a>
    <div class="video">
      <b>Dynamic earthquake test of a large seismic isolation bearing</b>
      <span class="mute">Multi-directional dynamic earthquake test of a 1.8 m diameter high-damping rubber bearing at the Caltrans SRMD Facility, University of California, San Diego.</span>
      {todo('YouTube link to add.')}</div>
  </div>
</section>
<section class="block" id="codes">
  <h2>Codes and standards around the world</h2>
  {todo('Content to come.')}
</section>
<section class="block" id="labs">
  <h2>Independent test laboratories</h2>
  {todo('Content to come.')}
</section>
<section class="block" id="publications">
  <h2>Articles and publications</h2>
  {todo('Content to come.')}
</section>'''

for f, t, d, b in [
    ('about.html', 'About', 'About the Global Isolation Survey: mission, team, partner organizations and contact.', about),
    ('participate.html', 'Participate', 'Contribute an isolated building to the Global Isolation Survey database, or take part in our surveys.', participate),
    ('learn.html', 'Learn', 'Explore seismically isolated buildings around the world and the Global Isolation Survey findings.', learn),
    ('resources.html', 'Resources', 'Videos, codes, test laboratories and publications on seismic isolation.', resources)]:
    open(f, 'w', encoding='utf-8').write(page(f, t, d, b))

# keep the Buildings page nav in step with the others
h = open('index.html', encoding='utf-8').read()
nav = '\n'.join(f'    <a{" class=\"on\"" if f == "index.html" else ""} href="{f}">{t}</a>' for f, t in NAV)
h = re.sub(r'(<nav>\n).*?(\n  </nav>)', lambda m: m.group(1) + nav + m.group(2), h, count=1, flags=re.S)
open('index.html', 'w', encoding='utf-8').write(h)
print('ok')
