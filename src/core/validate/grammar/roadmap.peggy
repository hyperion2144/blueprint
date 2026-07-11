// Roadmap grammar — milestones and phases with status
// Uses TitleLine (stops at " [") instead of LineRest to avoid consuming [STATUS]

Roadmap
  = "# Roadmap:" __ name:LineRest NEWLINE
    milestones:MilestoneSection+ __ (.)*
    { return { name, milestones }; }

MilestoneSection
  = __ "## Md-" id:Integer ": " title:TitleLine " [" status:MstoneStatus "]" NEWLINE
    __ phases:PhaseSection+
    { return { id, title, status, phases }; }

MstoneStatus
  = "NOT_STARTED" / "ACTIVE" / "COMPLETED"

PhaseSection
  = __ "### Ph-" mid:Integer "." pid:Integer ": " title:TitleLine " [" status:PStatus "]" NEWLINE
    body:PhaseBody?
    { return { id: mid + '.' + pid, title, status, body: body || "" }; }
PStatus
  = "NOT_STARTED" / "ACTIVE" / "COMPLETED"
PhaseBody
  = lines:(_ !"### " !"## " text:LineRest NEWLINE { return text; })+
    { return lines.join("\n").trim(); }
TitleLine
  = chars:(! " [" char:[^\n\r])+ { return chars.map(c => c[1]).join("").trim(); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
