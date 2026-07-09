// Spec review grammar — constraint table + issues

SpecReview
  = "# Spec Review:" __ name:LineRest NEWLINE
    __ verdictLine
    __ table:ConstraintTable
    __ issues:IssuesSection?
    { return { name, issues: issues || [] }; }

verdictLine
  = "## Overall: " verdict:( "PASS" / "FAIL" / "NEEDS_REVISION") NEWLINE
    { /* consumed */ }

ConstraintTable
  = "## Constraint Checklist" NEWLINE tableRow* constraintRow+

IssuesSection
  = "## Issues" NEWLINE issues:IssueItem*
    { return issues; }

IssueItem
  = __ "- [" checkbox:CheckState "] " prefix:IssuePrefix id:Integer " — " text:LineRest NEWLINE
    { return { id: prefix + id, text, checked: checkbox === 'x' }; }

IssuePrefix
  = "R" / "Q" / "G" / "D"

CheckState
  = " " { return ' '; }
  / "x" { return 'x'; }

// Table parsing — simplified
tableRow = __ "|" text:(!"\n" .)* NEWLINE
constraintRow = __ "| " prefix:IssuePrefix id:Integer " |" text:(!"\n" .)* NEWLINE

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
