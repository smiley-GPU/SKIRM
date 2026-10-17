package skirm.core;

import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Minimal JSON reader/writer: enough for the wire protocol, zero dependencies. */
public final class Json {
    private Json() {}

    /** Ordered object literal: {@code Json.obj("a", 1, "b", 2)}. */
    public static Map<String, Object> obj(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    public static String write(Object v) {
        StringBuilder sb = new StringBuilder(4096);
        write(sb, v);
        return sb.toString();
    }

    private static void write(StringBuilder sb, Object v) {
        if (v == null) sb.append("null");
        else if (v instanceof String s) str(sb, s);
        else if (v instanceof Enum<?> e) str(sb, e.name());
        else if (v instanceof Boolean b) sb.append(b);
        else if (v instanceof Double d) {
            if (d == Math.rint(d) && !d.isInfinite()) sb.append(d.longValue());
            else sb.append(d);
        } else if (v instanceof Number n) sb.append(n);
        else if (v instanceof Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                str(sb, String.valueOf(e.getKey()));
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof Iterable<?> it) {
            sb.append('[');
            boolean first = true;
            for (Object o : it) {
                if (!first) sb.append(',');
                first = false;
                write(sb, o);
            }
            sb.append(']');
        } else if (v instanceof Record rec) {
            sb.append('{');
            boolean first = true;
            for (RecordComponent c : rec.getClass().getRecordComponents()) {
                if (!first) sb.append(',');
                first = false;
                str(sb, c.getName());
                sb.append(':');
                try {
                    write(sb, c.getAccessor().invoke(rec));
                } catch (ReflectiveOperationException e) {
                    throw new IllegalStateException(e);
                }
            }
            sb.append('}');
        } else str(sb, v.toString());
    }

    private static void str(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        sb.append('"');
    }

    public static Object parse(String s) {
        Parser p = new Parser(s);
        p.ws();
        Object v = p.value();
        p.ws();
        if (p.i != s.length()) throw p.err("Trailing characters");
        return v;
    }

    private static final class Parser {
        final String s;
        int i;

        Parser(String s) { this.s = s; }

        void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

        Object value() {
            if (i >= s.length()) throw err("Unexpected end");
            return switch (s.charAt(i)) {
                case '{' -> object();
                case '[' -> array();
                case '"' -> string();
                case 't' -> literal("true", Boolean.TRUE);
                case 'f' -> literal("false", Boolean.FALSE);
                case 'n' -> literal("null", null);
                default -> number();
            };
        }

        Map<String, Object> object() {
            i++;
            Map<String, Object> m = new LinkedHashMap<>();
            ws();
            if (peek('}')) { i++; return m; }
            while (true) {
                ws();
                String k = string();
                ws();
                expect(':');
                ws();
                m.put(k, value());
                ws();
                if (peek(',')) { i++; continue; }
                expect('}');
                return m;
            }
        }

        List<Object> array() {
            i++;
            List<Object> l = new ArrayList<>();
            ws();
            if (peek(']')) { i++; return l; }
            while (true) {
                ws();
                l.add(value());
                ws();
                if (peek(',')) { i++; continue; }
                expect(']');
                return l;
            }
        }

        String string() {
            expect('"');
            StringBuilder sb = new StringBuilder();
            while (true) {
                if (i >= s.length()) throw err("Unterminated string");
                char c = s.charAt(i++);
                if (c == '"') return sb.toString();
                if (c != '\\') { sb.append(c); continue; }
                if (i >= s.length()) throw err("Bad escape");
                char e = s.charAt(i++);
                switch (e) {
                    case 'n' -> sb.append('\n');
                    case 't' -> sb.append('\t');
                    case 'r' -> sb.append('\r');
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'u' -> {
                        if (i + 4 > s.length()) throw err("Bad unicode escape");
                        sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                        i += 4;
                    }
                    default -> sb.append(e);
                }
            }
        }

        Object number() {
            int start = i;
            while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
            if (start == i) throw err("Unexpected character");
            try {
                return Double.parseDouble(s.substring(start, i));
            } catch (NumberFormatException e) {
                throw err("Bad number");
            }
        }

        Object literal(String word, Object v) {
            if (!s.startsWith(word, i)) throw err("Bad literal");
            i += word.length();
            return v;
        }

        boolean peek(char c) { return i < s.length() && s.charAt(i) == c; }

        void expect(char c) {
            if (!peek(c)) throw err("Expected '" + c + "'");
            i++;
        }

        RuleException err(String msg) { return new RuleException("Malformed JSON: " + msg + " at " + i); }
    }
}
