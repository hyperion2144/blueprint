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
    "- Reason: " reason:LineRest NEWLINE
    references:RefLine?
    { return { id, title, status, reason }; }

RefLine
  = "- References: " text:LineRest NEWLINE

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

_ = [ 	]*
__
  = [ \t]*

NEWLINE
  = "\n" / "\r\n" / "\r"
