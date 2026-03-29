import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExportMenuPanel } from './ExportMenuPanel';

vi.mock('react-i18next', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    return {
        ...actual,
        useTranslation: () => ({
            t: (
                key: string,
                options?: string | { defaultValue?: string; appName?: string }
            ) => {
                if (typeof options === 'string') {
                    return options;
                }

                if (key === 'export.openflowdslLabel') {
                    return `${options?.appName ?? 'OpenFlowKit'} DSL`;
                }

                return options?.defaultValue ?? key;
            },
        }),
    };
});

describe('ExportMenuPanel', () => {
    it('switches categories and updates the format selector content', () => {
        render(<ExportMenuPanel onSelect={vi.fn()} />);

        expect(screen.getByRole('button', { name: /PNG/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('tab', { name: /Code/i }));

        expect(screen.getByRole('button', { name: /JSON File/i })).toBeTruthy();

        fireEvent.click(within(screen.getByTestId('export-format-select')).getByRole('button', { name: /JSON File/i }));
        fireEvent.click(within(screen.getByRole('listbox')).getByRole('button', { name: /Mermaid/i }));

        expect(screen.getByRole('button', { name: /Mermaid/i })).toBeTruthy();
        expect(screen.getByTestId('export-action-mermaid-download')).toBeTruthy();
        expect(screen.getByTestId('export-action-mermaid-copy')).toBeTruthy();
    });

    it('fires the selected export key from the primary action button', () => {
        const onSelect = vi.fn();

        render(<ExportMenuPanel onSelect={onSelect} />);

        fireEvent.click(screen.getByRole('tab', { name: /Code/i }));
        fireEvent.click(within(screen.getByTestId('export-format-select')).getByRole('button', { name: /JSON File/i }));
        fireEvent.click(within(screen.getByRole('listbox')).getByRole('button', { name: /Figma Editable/i }));
        fireEvent.click(screen.getByTestId('export-action-figma-copy'));

        expect(onSelect).toHaveBeenCalledWith('figma', 'copy');
    });

    it('shows cinematic build options in the video section', () => {
        render(<ExportMenuPanel onSelect={vi.fn()} />);

        fireEvent.click(screen.getByRole('tab', { name: /Video/i }));
        fireEvent.click(within(screen.getByTestId('export-format-select')).getByRole('button', { name: /Cinematic Build Video/i }));

        expect(within(screen.getByTestId('export-format-select')).getByRole('button', { name: /Cinematic Build Video/i })).toBeTruthy();
        expect(within(screen.getByRole('listbox')).getByRole('button', { name: /Cinematic Build Video/i })).toBeTruthy();
        expect(within(screen.getByRole('listbox')).getByRole('button', { name: /Cinematic Build GIF/i })).toBeTruthy();
        expect(within(screen.getByRole('listbox')).queryByRole('button', { name: /Playback Video/i })).toBeNull();
    });

    it('renders video controls before the download action and uses shared control interactions', () => {
        const onCinematicSpeedChange = vi.fn();
        const onCinematicResolutionChange = vi.fn();
        const onCinematicTransparentChange = vi.fn();

        render(
            <ExportMenuPanel
                onSelect={vi.fn()}
                cinematicSpeed="normal"
                onCinematicSpeedChange={onCinematicSpeedChange}
                cinematicResolution="1080p"
                onCinematicResolutionChange={onCinematicResolutionChange}
                cinematicTransparent={false}
                onCinematicTransparentChange={onCinematicTransparentChange}
            />
        );

        fireEvent.click(screen.getByRole('tab', { name: /Video/i }));

        const panelText = screen.getByText(/Transparent background/i);
        const downloadButton = screen.getByTestId('export-action-cinematic-video-download');

        expect(
            panelText.compareDocumentPosition(downloadButton) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '2×' }));
        fireEvent.click(screen.getByRole('button', { name: '4K' }));
        fireEvent.click(screen.getByRole('switch'));

        expect(onCinematicSpeedChange).toHaveBeenCalledWith('fast');
        expect(onCinematicResolutionChange).toHaveBeenCalledWith('4k');
        expect(onCinematicTransparentChange).toHaveBeenCalledWith(true);
    });
});
