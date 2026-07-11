# Kurzbeschreibung des Tools

Der PRISMA Analyser ist ein lokal ausführbares Assistenzwerkzeug zur teilautomatisierten Auswertung einer PRISMA-Checkliste in Excel. Das System liest strukturierte Einträge aus einer Arbeitsmappe ein, ruft verlinkte Webquellen und relevante Unterseiten beziehungsweise Dokumente ab und lässt diese Inhalte durch ein KI-Modell im Hinblick auf definierte Einschluss- und Ausschlusskriterien bewerten. Die Ergebnisse werden strukturiert in eine neue Excel-Datei zurückgeschrieben.

Technisch basiert das Werkzeug auf TypeScript und Node.js. Für die Tabellenverarbeitung wird ExcelJS verwendet, für Webabrufe und Inhaltsgewinnung unter anderem Undici, Cheerio und PDF-Parsing. Die Validierung der Modellantworten erfolgt mittels Zod. Die KI-gestützte Analyse wird über das pi SDK beziehungsweise den pi Coding Agent eingebunden.

Ein zentrales Merkmal ist die flexible Modellwahl: Das zu verwendende KI-Modell kann gezielt vorgegeben werden. Dabei ist das Werkzeug nicht auf ein einzelnes Modell festgelegt, sondern kann – abhängig von der verfügbaren pi-Konfiguration – unterschiedliche Modelle beziehungsweise Provider ansprechen. Dadurch lässt sich die Analyse an fachliche, qualitative oder infrastrukturelle Anforderungen anpassen.

Ergänzend erzeugt das System Begründungsdateien für Nachvollziehbarkeit, führt Checkpoints für robuste Laufwiederaufnahme und markiert unsichere Fälle für eine manuelle Nachprüfung. Insgesamt unterstützt das Werkzeug damit einen reproduzierbaren, transparenten und praxisnahen Screening-Prozess im Rahmen wissenschaftsorientierter Auswertungen.
