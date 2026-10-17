package skirm.core;

/** A command the rules reject (bad target, not enough AP, wrong phase...). Maps to HTTP 400. */
public final class RuleException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public RuleException(String message) { super(message); }
}
