// Tasks grammar — T items with refs to DS, types, spec_ref

Tasks
  = "# Tasks:" __ name:LineRest NEWLINE
    __ body:(WaveSection / TaskItem / BlankLine / OtherLine)* __ (.)* { 
      const tasks = [];
      for (const b of body) {
        if (b && b.tasks) tasks.push(...b.tasks);
        else if (b && b.id !== undefined) tasks.push(b);
      }
      return { name, tasks }; 
    }

WaveSection
  = "## Wave " id:Integer ": " title:LineRest NEWLINE tasks:TaskItem*
    { return { wave: id, theme: title, tasks }; }

TaskItem
  = __ "- [" checkbox:CheckState "] T-" id:Integer ": [type:" typeName:TypeName "] " title:LineRest NEWLINE
    fields:FieldLine*
    { 
      const fmap = {};
      for (const f of fields) fmap[f.key] = f.val;
      return { id, type: typeName, title, checked: checkbox === 'x', fields: fmap }; 
    }
  / __ "- [" checkbox:CheckState "] T-" text:$[^ :\n\r]+ &{ return isNaN(parseInt(text)); }
    { error('"T-' + text + '": ID must be numeric (e.g. "T-1")'); }

FieldLine
  = __ "- **" key:FieldKey "**:" _ firstLine:LineRest NEWLINE
    restLines:(__ !"- **" !"## " !"- [" text:LineRest NEWLINE)*
    {
      const val = [firstLine, ...restLines.map(r => r.text)].join("\n");
      return { key, val };
    }
  / __ "- **" key:FieldKey "**:" _ (LineRest / "") NEWLINE
    { return { key, val: "" }; }

FieldKey
  = "refs" { return "refs"; }
  / "files" { return "files"; }
  / "spec_ref" { return "spec_ref"; }
  / "acceptance" { return "acceptance"; }
  / "depends_on" { return "depends_on"; }
  / "description" { return "description"; }

CheckState
  = " " { return ' '; }
  / "x" { return 'x'; }

TypeName
  = "behavior" { return "behavior"; }
  / "config" { return "config"; }
  / "refactor" { return "refactor"; }
  / "docs" { return "docs"; }
  / "scaffolding" { return "scaffolding"; }
  / text:$[^\]\n\r]+ { error('"' + text + '": invalid task type — must be one of: behavior/config/refactor/docs/scaffolding'); }

BlankLine
  = NEWLINE

OtherLine
  = __ text:LineRest NEWLINE

Integer
  = digits:[0-9]+ { return parseInt(digits.join("")); }

LineRest
  = chars:[^\n\r]+ { return chars.join("").trim(); }

_ = [ 	]*
__
  = [ \t\n\r]*

NEWLINE
  = "\n" / "\r\n" / "\r"
