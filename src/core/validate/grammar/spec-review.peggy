// Spec review grammar — constraint table + issues

SpecReview
  = "# Spec Review:" __ name:LineRest NEWLINE
    Gap verdictLine
    Gap table:ConstraintTable
    Gap issues:IssuesSection? __ (.)*
    { return { name, issues: issues || [] }; }
verdictLine
  = "## Overall: " verdict:( "PASS" / "FAIL" / "NEEDS_REVISION") NEWLINE
    { /* consumed */ }

ConstraintTable
  = "## Constraint Checklist" NEWLINE (HeaderRow / BlankLine)* constraintRow+
HeaderRow
  = __ "|" !(" " (IssuePrefix Integer)) text:(!"\n" .)* NEWLINE
BlankLine = NEWLINE

Gap = ( !"##" LineRest NEWLINE / NEWLINE )*

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
constraintRow
  = __ "| " prefix:IssuePrefix id:Integer " |" text:(!"\n" .)* NEWLINE
  / __ "| " prefix:IssuePrefix text:$[^ |\n\r]+ { error('"' + prefix + text + '": ID must be numeric (e.g. "' + prefix + '1")'); }

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
