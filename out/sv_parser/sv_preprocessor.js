'user strict';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const svx = require("./antlr_out/SystemVerilogLexer");
const fs = require("fs");
///////////////////////////////////////////////////////////////////////////////
// utils
///////////////////////////////////////////////////////////////////////////////
class position {
    constructor(l = 0, c = 0) {
        this.line = l;
        this.character = c;
    }
}
exports.position = position;
class region {
    constructor(sl = 0, sc = 0, el = 0, ec = 0) {
        this.start = new position(sl, sc);
        this.end = new position(el, ec);
    }
}
exports.region = region;
class replace {
    constructor() {
        this.src = new region();
        this.dst = new region();
    }
}
exports.replace = replace;
class macro {
}
exports.macro = macro;
///////////////////////////////////////////////////////////////////////////////
// sv_preprocessor
///////////////////////////////////////////////////////////////////////////////
// exports.preprocessor = class preprocessor extends svlis.SystemVerilogListener {
class sv_preprocessor {
    constructor(rew, preDefines) {
        this.incpath = [];
        this.rew = rew;
        this.macros = {};
        this.repl_tbl = [];
        if (preDefines) {
            preDefines.forEach(element => {
                let mcr = new macro();
                mcr.ident = element[0];
                mcr.text = element[1];
                mcr.text_line = 0;
                mcr.text_char = 0;
                this.macros[mcr.ident] = mcr;
            });
        }
        return this;
    }
    // ==========================================================================
    //
    // ==========================================================================
    enterEveryRule(ctx) { }
    exitEveryRule(ctx) { }
    visitTerminal(node) {
    }
    visitErrorNode(node) {
    }
    // ==========================================================================
    //
    // ==========================================================================
    exitPp_text(ctx) {
    }
    exitPp_default_nettype(ctx) {
        ;
    }
    exitPp_include(ctx) {
        let fname = ctx.PP_STRING().text.trim();
        fname = fname.substring(1, fname.length - 1).trim();
        let text = null;
        for (let ip of this.incpath) {
            let abspath = ip + "\\" + fname;
            try {
                text = fs.readFileSync(abspath).toString();
            }
            catch (err) {
                text = null;
            }
            if (text) {
                break;
            }
        }
        if (!text) {
            return;
        }
        let textlist = text.split("\n");
        this.rew.replace(ctx.start, ctx.stop, text);
        let repl = new replace();
        repl.src.start = { line: ctx.start.line, character: ctx.start.charPositionInLine };
        repl.src.end = { line: ctx.start.line, character: ctx.start.charPositionInLine + ctx.start.text.length };
        repl.dst.start = repl.src.start;
        repl.dst.end = { line: repl.dst.start.line + textlist.length - 1,
            character: repl.dst.start.character + textlist[textlist.length - 1].length };
        repl.ofs_line = repl.dst.end.line - repl.src.end.line;
        repl.ofs_char = (repl.ofs_line) ? 0 : repl.dst.end.character - repl.src.end.character;
        // repl.dst.start.line += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
        // repl.dst.end.line   += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
        this.repl_tbl.push(repl);
    }
    exitPp_define_only(ctx) {
        let mcr = new macro();
        mcr.ident = ctx.DF_IDENT().text;
        mcr.text = "";
        mcr.text_line = 0;
        mcr.text_char = 0;
        this.macros[mcr.ident] = mcr;
    }
    exitPp_define_noarg(ctx) {
        let mcr = new macro();
        mcr.ident = ctx.DF_MACRO_NAME_NOARG().text.trim();
        mcr.text = ctx.DFTX_MACRO_TEXT().text;
        mcr.text = mcr.text.replace(/\\\r?\n/g, '\n');
        let lines = mcr.text.split('\n');
        mcr.text_line = lines.length;
        mcr.text_char = lines[lines.length - 1].length - 1;
        this.macros[mcr.ident] = mcr;
    }
    exitPp_define_arg(ctx) {
        let mcr = new macro();
        let name = ctx.DF_MACRO_NAME_ARG().text;
        mcr.ident = name.substring(0, name.length - 1).trim();
        mcr.args = [];
        for (let arg of ctx.DFAG_IDENT()) {
            mcr.args.push(arg.text);
        }
        mcr.text = ctx.DFTX_MACRO_TEXT().text;
        mcr.text = mcr.text.replace(/\\\r?\n/g, '\n');
        let lines = mcr.text.split('\n');
        mcr.text_line = lines.length;
        mcr.text_char = lines[lines.length - 1].length - 1;
        this.macros[mcr.ident] = mcr;
    }
    exitPp_undef(ctx) {
        let ident = ctx.PP_IDENT().text;
        delete this.macros[ident];
    }
    exitPp_call_noarg(ctx) {
        let ident = ctx.PP_CALL_NOARG().text;
        if (ident[0] == '`')
            ident = ident.substring(1, ident.length);
        let mcr = this.macros[ident];
        if (mcr) {
            let token = ctx.PP_CALL_NOARG().symbol;
            this.rew.replace(token, token, mcr.text);
            let repl = new replace();
            repl.src.start = { line: token.line, character: token.charPositionInLine };
            repl.src.end = { line: token.line, character: token.charPositionInLine + token.text.length };
            repl.dst.start = repl.src.start;
            repl.dst.end = { line: repl.dst.start.line + mcr.text_line - 1,
                character: repl.dst.start.character + mcr.text_char };
            repl.ofs_line = repl.dst.end.line - repl.src.end.line;
            repl.ofs_char = (repl.ofs_line) ? 0 : repl.dst.end.character - repl.src.end.character;
            // repl.dst.start.line += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
            // repl.dst.end.line   += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
            this.repl_tbl.push(repl);
        }
    }
    exitPp_call_arg(ctx) {
        let name = ctx.PP_CALL_ARG().text;
        let ident = name.substring(1, name.length - 1).trim();
        let args = [];
        for (let arg of ctx.PPCL_IDENT()) {
            args.push(arg.text);
        }
        let mcr = this.macros[ident];
        if (mcr) {
            let text = mcr.text;
            for (let i = 0; i < mcr.args.length; ++i) {
                let mcrarg = mcr.args[i];
                let re = new RegExp(`\\b${mcrarg}\\b`, "g");
                text = text.replace(re, args[i]);
            }
            text = text.replace(/``/g, "");
            this.rew.replace(ctx.start, ctx.stop, text);
            let repl = new replace();
            repl.src.start = { line: ctx.start.line, character: ctx.start.charPositionInLine };
            repl.src.end = { line: ctx.start.line, character: ctx.start.charPositionInLine + ctx.start.text.length };
            repl.dst.start = repl.src.start;
            repl.dst.end = { line: repl.dst.start.line + mcr.text_line - 1,
                character: repl.dst.start.character + mcr.text_char };
            repl.ofs_line = repl.dst.end.line - repl.src.end.line;
            repl.ofs_char = (repl.ofs_line) ? 0 : repl.dst.end.character - repl.src.end.character;
            // repl.dst.start.line += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
            // repl.dst.end.line   += (this.repl_tbl.length) ? this.repl_tbl[this.repl_tbl.length-1].ofs_line : 0;
            this.repl_tbl.push(repl);
        }
    }
    exitPp_ifdef(ctx) {
        let ppifdef = ctx.PP_IFDEF();
        let ppifndef = ctx.PP_IFNDEF();
        let ppidents = ctx.PP_IDENT();
        let ppelifs = ctx.PP_ELIF();
        let ppelse = ctx.PP_ELSE();
        let ppendif = ctx.PP_ENDIF();
        let ppelse_arr;
        if (!ppelse)
            ppelse_arr = [];
        else
            ppelse_arr = [ppelse];
        let anchors = [ppifdef].concat(ppelifs).concat(ppelse_arr).concat(ppendif);
        let sat = false;
        let delete_tokens_in_default = function (start, end) {
            for (let j = start; j < end; ++j) {
                let token = this.tokens.get(j);
                if (token.channel == svx.SystemVerilogLexer.DEFAULT_TOKEN_CHANNEL) {
                    this.rew.delete(token);
                }
            }
        }.bind(this);
        for (let i = 0; i < ppidents.length; ++i) {
            this.rew.delete(anchors[i].symbol);
            this.rew.delete(ppidents[i].symbol);
            let decision = (anchors[i].text == "`ifdef" || anchors[i].text == "`elif") ? true : false;
            let mcr = this.macros[ppidents[i].text];
            if (!sat && (decision && mcr || !decision && !mcr)) {
                sat = true;
            }
            else {
                if (anchors[i + 1].symbol.tokenIndex - anchors[i].symbol.tokenIndex > 1) {
                    delete_tokens_in_default(anchors[i].symbol.tokenIndex + 1, anchors[i + 1].symbol.tokenIndex - 1);
                }
            }
        }
        if (ppelse) {
            this.rew.delete(ppelse.symbol);
            if (sat && (ppendif.symbol.tokenIndex - ppelse.symbol.tokenIndex > 1)) {
                delete_tokens_in_default(ppelse.symbol.tokenIndex + 1, ppendif.symbol.tokenIndex - 1);
            }
        }
        this.rew.delete(ppendif.symbol);
    }
}
exports.sv_preprocessor = sv_preprocessor;
//# sourceMappingURL=sv_preprocessor.js.map