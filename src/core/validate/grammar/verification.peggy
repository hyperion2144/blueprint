// Verification grammar — status and checkbox items

Verification
  = "# Verification:" __ name:LineRest NEWLINE
    __ statusLine
    __ items:CheckItem*
    { return { name, items: items.filter(i => i !== null) }; }

statusLine
  = "## Status: " status:StatusType NEWLINE
    { /* consumed */ }

StatusType
  = "passed" / "gaps_found" / "human_needed"

CheckItem
  = __ "- [" checkbox:CheckState "] " text:LineRest NEWLINE
    { return { checked: checkbox === 'x', text }; }
  / NEWLINE { return null; }
  / __ text:LineRest NEWLINE { return null; }

CheckState
  = " " { return ' '; }
  / "x" { return 'x'; }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
