// Roadmap grammar — milestones and phases with status

Roadmap
  = "# Roadmap:" __ name:LineRest NEWLINE
    __ milestones:MilestoneSection+
    { return { name, milestones }; }

MilestoneSection
  = "## Md-" id:Integer ": " title:LineRest " [" status:MstoneStatus "]" NEWLINE
    phases:PhaseSection+
    { return { id, title, status, phases }; }

MstoneStatus
  = "NOT_STARTED" / "ACTIVE" / "COMPLETED"

PhaseSection
  = "### Ph-" mid:Integer "." pid:Integer ": " title:LineRest " [" status:PStatus "]" NEWLINE
    { return { id: mid + '.' + pid, title, status }; }

PStatus
  = "NOT_STARTED" / "ACTIVE" / "COMPLETED"

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
