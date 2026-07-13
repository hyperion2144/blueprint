// Goal review grammar — goal checklist table + assessment + issues section

GoalReview
  = "# Goal Review:" __ name:LineRest NEWLINE
    Gap verdictLine
    Gap table:GoalTable
    Gap assessment
    Gap issues:IssuesSection? __ (.)*
    { return { name, issues: issues || [] }; }

verdictLine = "## Overall: " ("PASS" / "FAIL" / "NEEDS_REVISION") NEWLINE

GoalTable = "## Goal Checklist" NEWLINE (HeaderRow / BlankLine)* goalRow+
assessment = "## Completeness Assessment" NEWLINE line+
HeaderRow = __ "|" !(" " ("G"/"D") Integer) text:(!"\n" .)* NEWLINE
BlankLine = NEWLINE
IssuesSection = "## Issues" NEWLINE issues:IssueItem* { return issues; }

IssueItem = __ "- [" checkbox:CheckState "] " prefix:("G"/"D") id:Integer " — " text:LineRest NEWLINE
  { return { id: prefix + id, text, checked: checkbox === 'x' }; }

line = __ !"##" text:LineRest NEWLINE

CheckState = " " { return ' '; } / "x" { return 'x'; }

Gap = ( !"##" LineRest NEWLINE / NEWLINE )*
tableRow = __ "|" text:(!"\n" .)* NEWLINE
goalRow
  = __ "| G" id:Integer " |" text:(!"\n" .)* NEWLINE
  / __ "| G" text:$[^ |\n\r]+ { error('"G' + text + '": ID must be numeric (e.g. "G1")'); }

Integer = digits:[0-9]+ { return parseInt(digits.join("")); }
LineRest = chars:[^\n\r]+ { return chars.join("").trim(); }
__ = [ \t\n\r]*
NEWLINE = "\n" / "\r\n" / "\r"
