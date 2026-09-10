// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageSelector from "@/components/upload/PageSelector";
import { PageRangeDisplay, RotationSelector, SplitModeSelector, DuplicateCountSelector } from "@/components/upload/PageSelector";

describe("PageSelector", () => {
  it("renders the label", () => {
    render(
      <PageSelector label="Pages" value="" onChange={vi.fn()} />
    );
    expect(screen.getByText("Pages")).toBeTruthy();
  });

  it("renders input with placeholder", () => {
    render(
      <PageSelector label="Pages" value="" onChange={vi.fn()} />
    );
    const input = screen.getByPlaceholderText("e.g. 1-3, 5, 8-10");
    expect(input).toBeTruthy();
  });

  it("displays current value", () => {
    render(
      <PageSelector label="Pages" value="1-3, 5" onChange={vi.fn()} />
    );
    const input = screen.getByDisplayValue("1-3, 5");
    expect(input).toBeTruthy();
  });

  it("calls onChange when input changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PageSelector label="Pages" value="" onChange={onChange} />
    );
    await user.type(screen.getByRole("textbox"), "1-3");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders preset buttons", () => {
    const presets = [
      { label: "All", value: "" },
      { label: "First", value: "1" },
      { label: "Last", value: "5" },
    ];
    render(
      <PageSelector label="Pages" value="" onChange={vi.fn()} presets={presets} />
    );
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Last")).toBeTruthy();
  });

  it("calls onChange when preset is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const presets = [
      { label: "All", value: "" },
      { label: "First", value: "1" },
    ];
    render(
      <PageSelector label="Pages" value="" onChange={onChange} presets={presets} />
    );
    await user.click(screen.getByText("First"));
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("marks preset as pressed when value matches", () => {
    const presets = [
      { label: "All", value: "" },
      { label: "First", value: "1" },
    ];
    render(
      <PageSelector label="Pages" value="1" onChange={vi.fn()} presets={presets} />
    );
    const firstBtn = screen.getByText("First");
    expect(firstBtn.getAttribute("aria-pressed")).toBe("true");
    const allBtn = screen.getByText("All");
    expect(allBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows validation error when validate returns error", () => {
    const validate = (v: string) => {
      if (v === "bad") return "Invalid page range";
      return null;
    };
    render(
      <PageSelector label="Pages" value="bad" onChange={vi.fn()} validate={validate} />
    );
    expect(screen.getByText("Invalid page range")).toBeTruthy();
  });

  it("sets aria-invalid on input when validation fails", () => {
    const validate = () => "Error";
    render(
      <PageSelector label="Pages" value="bad" onChange={vi.fn()} validate={validate} />
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("does not set aria-invalid when validation passes", () => {
    const validate = () => null;
    render(
      <PageSelector label="Pages" value="1-3" onChange={vi.fn()} validate={validate} />
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("shows help text when no validation error", () => {
    render(
      <PageSelector label="Pages" value="" onChange={vi.fn()} helpText="Enter page numbers" />
    );
    expect(screen.getByText("Enter page numbers")).toBeTruthy();
  });

  it("hides help text when validation error is present", () => {
    const validate = () => "Error";
    render(
      <PageSelector label="Pages" value="bad" onChange={vi.fn()} validate={validate} helpText="Enter page numbers" />
    );
    expect(screen.queryByText("Enter page numbers")).toBeNull();
  });

  it("generates unique IDs via useId", () => {
    const { container } = render(
      <>
        <PageSelector label="Pages A" value="" onChange={vi.fn()} />
        <PageSelector label="Pages B" value="" onChange={vi.fn()} />
      </>
    );
    const inputs = container.querySelectorAll("input");
    expect(inputs[0]?.id).not.toBe(inputs[1]?.id);
  });
});

describe("PageRangeDisplay", () => {
  it("shows all pages when no selection", () => {
    render(<PageRangeDisplay totalPages={5} />);
    expect(screen.getByText("All 5 pages selected")).toBeTruthy();
  });

  it("shows singular for single page", () => {
    render(<PageRangeDisplay totalPages={1} />);
    expect(screen.getByText("All 1 page selected")).toBeTruthy();
  });

  it("shows selected pages", () => {
    render(<PageRangeDisplay totalPages={10} selectedPages="1-3, 5" />);
    expect(screen.getByText("10 pages total · Currently selecting: 1-3, 5")).toBeTruthy();
  });
});

describe("RotationSelector", () => {
  it("renders rotation options", () => {
    render(<RotationSelector value="90" onChange={vi.fn()} />);
    expect(screen.getByText("90°")).toBeTruthy();
    expect(screen.getByText("180°")).toBeTruthy();
    expect(screen.getByText("270°")).toBeTruthy();
  });

  it("marks selected rotation as pressed", () => {
    render(<RotationSelector value="180" onChange={vi.fn()} />);
    const btn = screen.getByText("180°").closest("button");
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange when rotation is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RotationSelector value="90" onChange={onChange} />);
    await user.click(screen.getByText("270°"));
    expect(onChange).toHaveBeenCalledWith("270");
  });
});

describe("SplitModeSelector", () => {
  it("renders split modes", () => {
    render(<SplitModeSelector mode="all" onModeChange={vi.fn()} />);
    expect(screen.getByText("All Pages")).toBeTruthy();
    expect(screen.getByText("Every N Pages")).toBeTruthy();
    expect(screen.getByText("Custom Ranges")).toBeTruthy();
  });

  it("marks selected mode as pressed", () => {
    render(<SplitModeSelector mode="every" onModeChange={vi.fn()} />);
    const btn = screen.getByText("Every N Pages").closest("button");
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onModeChange when mode is clicked", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<SplitModeSelector mode="all" onModeChange={onModeChange} />);
    await user.click(screen.getByText("Custom Ranges"));
    expect(onModeChange).toHaveBeenCalledWith("ranges");
  });
});

describe("DuplicateCountSelector", () => {
  it("renders count options", () => {
    render(<DuplicateCountSelector value="2" onChange={vi.fn()} />);
    expect(screen.getByText("2x")).toBeTruthy();
    expect(screen.getByText("3x")).toBeTruthy();
    expect(screen.getByText("4x")).toBeTruthy();
    expect(screen.getByText("5x")).toBeTruthy();
  });

  it("marks selected count as pressed", () => {
    render(<DuplicateCountSelector value="3" onChange={vi.fn()} />);
    const btn = screen.getByText("3x").closest("button");
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange when count is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DuplicateCountSelector value="2" onChange={onChange} />);
    await user.click(screen.getByText("4x"));
    expect(onChange).toHaveBeenCalledWith("4");
  });
});
