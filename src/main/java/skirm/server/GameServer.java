package skirm.server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import skirm.core.Hex;
import skirm.core.Json;
import skirm.core.RuleException;
import skirm.game.Game;
import skirm.model.Intel;
import skirm.model.Item;
import skirm.model.Loadout;
import skirm.model.Vehicle;
import skirm.tactical.ActionType;
import skirm.tactical.BattleEvent;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.Executors;

import static java.nio.charset.StandardCharsets.UTF_8;

/** JSON command API + static file host. Thin: parse, dispatch to Game, serialise the snapshot. */
public final class GameServer {
    private static final Map<String, String> MIME = Map.of(
            "html", "text/html; charset=utf-8",
            "js", "text/javascript; charset=utf-8",
            "css", "text/css; charset=utf-8",
            "json", "application/json",
            "svg", "image/svg+xml",
            "png", "image/png",
            "ico", "image/x-icon");

    private final Game game;
    private final Path webRoot;

    public GameServer(Game game, Path webRoot) {
        this.game = game;
        this.webRoot = webRoot.toAbsolutePath().normalize();
    }

    public void start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/", this::handleApi);
        server.createContext("/", this::handleStatic);
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
    }

    private void handleApi(HttpExchange ex) throws IOException {
        int status = 200;
        Object payload;
        try {
            payload = route(ex.getRequestMethod(), ex.getRequestURI().getPath(), readBody(ex));
        } catch (RuleException e) {
            status = 400;
            payload = Json.obj("error", e.getMessage());
        } catch (NoSuchElementException e) {
            status = 404;
            payload = Json.obj("error", e.getMessage());
        } catch (RuntimeException e) {
            e.printStackTrace();
            status = 500;
            payload = Json.obj("error", "Internal error: " + e);
        }
        send(ex, status, "application/json; charset=utf-8", Json.write(payload).getBytes(UTF_8));
    }

    private Object route(String method, String path, Map<String, Object> body) {
        synchronized (game) { // command + snapshot are one atomic step
            List<BattleEvent> events = List.of();
            switch (method + " " + path) {
                case "GET /api/state" -> { }
                case "POST /api/campaign/new" -> game.newCampaign(System.nanoTime());
                case "POST /api/briefing/intel" -> game.buyIntel(enumOf(Intel.class, body.get("intel")));
                case "POST /api/briefing/launch" -> game.launch(launchOrder(body));
                case "POST /api/continue" -> game.proceed();
                case "POST /api/battle/action" -> events = game.act(
                        intOf(body.get("unit")), enumOf(ActionType.class, body.get("type")),
                        body.get("q") == null ? null : new Hex(intOf(body.get("q")), intOf(body.get("r"))),
                        body.get("target") == null ? null : intOf(body.get("target")));
                case "POST /api/battle/end-turn" -> events = game.endTurn();
                case "POST /api/battle/abort" -> events = game.abort();
                default -> throw new NoSuchElementException("No route: " + method + " " + path);
            }
            return game.snapshot(events);
        }
    }

    // ---------------------------------------------------------------- wire parsing

    @SuppressWarnings("unchecked")
    private static Game.LaunchOrder launchOrder(Map<String, Object> body) {
        List<Integer> team = new ArrayList<>();
        for (Object o : (List<Object>) body.getOrDefault("team", List.of())) team.add(intOf(o));
        Map<Integer, Loadout> loadouts = new HashMap<>();
        Object raw = body.getOrDefault("loadouts", Map.of());
        if (!(raw instanceof Map<?, ?> lm)) throw new RuleException("loadouts must be an object");
        for (Map.Entry<?, ?> e : lm.entrySet()) {
            Map<String, Object> l = (Map<String, Object>) e.getValue();
            loadouts.put(Integer.parseInt(String.valueOf(e.getKey())), new Loadout(
                    optItem(l.get("weapon")), optItem(l.get("armor")), optItem(l.get("utility"))));
        }
        return new Game.LaunchOrder(team, loadouts,
                enumOf(Vehicle.class, body.get("insertion")), enumOf(Vehicle.class, body.get("extraction")));
    }

    private static Item optItem(Object v) { return v == null || "".equals(v) ? null : enumOf(Item.class, v); }

    private static <E extends Enum<E>> E enumOf(Class<E> type, Object v) {
        if (v == null) throw new RuleException("Missing " + type.getSimpleName());
        try {
            return Enum.valueOf(type, String.valueOf(v));
        } catch (IllegalArgumentException e) {
            throw new RuleException("Unknown " + type.getSimpleName() + ": " + v);
        }
    }

    private static int intOf(Object v) {
        if (v instanceof Number n) return n.intValue();
        throw new RuleException("Expected a number, got " + v);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readBody(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) return Map.of();
        String s;
        try (InputStream in = ex.getRequestBody()) {
            s = new String(in.readAllBytes(), UTF_8);
        }
        if (s.isBlank()) return Map.of();
        Object v = Json.parse(s);
        if (!(v instanceof Map)) throw new RuleException("Body must be a JSON object");
        return (Map<String, Object>) v;
    }

    // ---------------------------------------------------------------- static files

    private void handleStatic(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod()) && !"HEAD".equals(ex.getRequestMethod())) {
            send(ex, 405, "text/plain", "Method not allowed".getBytes(UTF_8));
            return;
        }
        String p = ex.getRequestURI().getPath();
        if (p.equals("/")) p = "/index.html";
        Path f = webRoot.resolve(p.substring(1)).normalize();
        if (!f.startsWith(webRoot) || !Files.isRegularFile(f)) {
            send(ex, 404, "text/plain", "Not found".getBytes(UTF_8));
            return;
        }
        String name = f.getFileName().toString();
        String ext = name.substring(name.lastIndexOf('.') + 1);
        send(ex, 200, MIME.getOrDefault(ext, "application/octet-stream"), Files.readAllBytes(f));
    }

    private static void send(HttpExchange ex, int status, String type, byte[] body) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type);
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        boolean head = "HEAD".equals(ex.getRequestMethod());
        ex.sendResponseHeaders(status, head ? -1 : body.length);
        try (OutputStream os = ex.getResponseBody()) {
            if (!head) os.write(body);
        }
    }
}
