// Quality review grammar — issues table + convention + issues section

QualityReview
  = "# Quality Review:" __ name:LineRest NEWLINE
    __ verdictLine
    __ table:IssueTable
    __ issues:IssuesSection?
    { return { name, issues: issues || [] }; }

verdictLine = "## Overall: " ("PASS" / "FAIL" / "NEEDS_REVISION") NEWLINE

IssueTable = "## Issues" NEWLINE tableRow* issueRow+ conventionTable?

conventionTable = "## Convention Compliance" NEWLINE tableRow* conventionRow+

IssuesSection = "## Issues" NEWLINE issues:IssueItem* { return issues; }

IssueItem = __ "- [" checkbox:CheckState "] " prefix:("Q"/"D") id:Integer " — " text:LineRest NEWLINE
  { return { id: prefix + id, text, checked: checkbox === 'x' }; }

CheckState = " " { return ' '; } / "x" { return 'x'; }

tableRow = __ "|" text:(!"\n" .)* NEWLINE
issueRow = __ "| Q" id:Integer " |" severity:Severity " |" text:(!"\n" .)* NEWLINE
conventionRow = __ "| " text:(!"\n" .)* NEWLINE
severityRow = __ "| Q" id:Integer " |" severity:Severity " |" text:(!"\n" .)* NEWLINE

Severity = "BLOCKER" / "MAJOR" / "MINOR" / "INFO"

Integer = digits:[0-9]+ { return parseInt(digits.join("")); }
LineRest = chars:[^\n\r]+ { return chars.join("").trim(); }
__ = [ \t\n\r]*
NEWLINE = "\n" / "\r\n" / "\r"
