// Quality review grammar — issues table + convention + issues section

QualityReview
  = "# Quality Review:" __ name:LineRest NEWLINE
    Gap verdictLine
    Gap table:IssueTable
    Gap issues:IssuesSection? __ (.)*
    { return { name, issues: issues || [] }; }

verdictLine = "## Overall: " ("PASS" / "FAIL" / "NEEDS_REVISION") NEWLINE
IssueTable = "## Issues" NEWLINE (HeaderRow / BlankLine)* issueRow+ __ conventionTable?
conventionTable = "## Convention Compliance" NEWLINE conventionRow+
BlankLine = NEWLINE
HeaderRow = __ "|" !(" " ("Q"/"D") Integer) text:(!"\n" .)* NEWLINE

Gap = ( !"##" LineRest NEWLINE / NEWLINE )*

IssuesSection = "## Issues" NEWLINE issues:IssueItem* { return issues; }

IssueItem = __ "- [" checkbox:CheckState "] " prefix:("Q"/"D") id:Integer " — " text:LineRest NEWLINE
  { return { id: prefix + id, text, checked: checkbox === 'x' }; }

CheckState = " " { return ' '; } / "x" { return 'x'; }
issueRow = __ "| Q" id:Integer " |" __ severity:Severity " |" text:(!"\n" .)* NEWLINE
conventionRow = __ "| " text:(!"\n" .)* NEWLINE
Severity = "BLOCKER" / "MAJOR" / "MINOR" / "INFO"

Integer = digits:[0-9]+ { return parseInt(digits.join("")); }
LineRest = chars:[^\n\r]+ { return chars.join("").trim(); }
__ = [ \t\n\r]*
NEWLINE = "\n" / "\r\n" / "\r"
