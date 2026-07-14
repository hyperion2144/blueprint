// Context grammar — phase decisions with D- numbering

Context
  = "# Context:" __ name:LineRest NEWLINE
    body:ContextLine*
    { return { name, decisions: body.filter(b => b && b.id !== undefined) }; }

ContextLine
  = d:Decision { return d; }
  / NEWLINE { return null; }
  / __ text:LineRest NEWLINE { return null; }

Decision
  = "## D-" id:Integer ": " title:LineRest NEWLINE
    "- Status: " status:LineRest NEWLINE
    decline:DecisionLine NEWLINE
    reasonLine:ReasonLine NEWLINE
    alternativeLine:AltLine?
    referenceLine:RefLine?
    { return { id, title, status, decision: decline, reason: reasonLine, alternatives: alternativeLine || "", references: referenceLine || "" }; }
  / "## D-" text:$[^:\n]+ { error('"D-' + text.split(':')[0].trim() + '": ID must be numeric (e.g. "D-1")'); }

DecisionLine
  = "- Decision: " text:LineRest { return text; }
ReasonLine
  = "- Reason: " text:LineRest { return text; }
AltLine
  = "- Alternatives: " text:LineRest { return text; }
RefLine
  = "- References: " text:LineRest { return text; }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

_ = [ \t]*
__
  = [ \t]*

NEWLINE
  = "\n" / "\r\n" / "\r"
