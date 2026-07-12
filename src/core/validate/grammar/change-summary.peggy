// Change summary grammar
// Parses # Change Summary: with ## Intent, ## Commits, ## Output Files

ChangeSummary
  = "# Change Summary:" __ name:LineRest NEWLINE
    Gap intent:IntentSection
    Gap commits:CommitsSection
    Gap files:FilesSection
    __ (.)*
    { return { name, intent, commits, files }; }

IntentSection
  = "## Intent" NEWLINE text:ContentBlock
    { return text; }

CommitsSection
  = "## Commits" NEWLINE items:CommitItem+
    { return items; }

CommitItem
  = __ "- " hash:LineRest ": " msg:LineRest NEWLINE
    { return { hash, message: msg }; }

FilesSection
  = "## Output Files" NEWLINE items:FileItem+
    { return items; }

FileItem
  = __ "- " path:LineRest ": " action:LineRest NEWLINE
    { return { path, action }; }

ContentBlock
  = lines:(_ !"## " !NEWLINE text:LineRest NEWLINE { return text; })+
    { return lines.join("\n"); }

Gap = ( !"##" LineRest NEWLINE / NEWLINE )*

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ \t]*
__ = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
