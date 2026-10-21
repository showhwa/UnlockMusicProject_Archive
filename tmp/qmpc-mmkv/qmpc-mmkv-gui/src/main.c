#include "resource.h"
#include <stdlib.h>
#include <windows.h>

static INT_PTR CALLBACK main_dialog(HWND dialog, UINT message, WPARAM wparam, LPARAM lparam)
{
    (void)lparam;
    switch (message)
    {
    case WM_INITDIALOG:
        return TRUE;
    case WM_COMMAND:
        if (LOWORD(wparam) == IDOK || LOWORD(wparam) == IDCANCEL)
        {
            EndDialog(dialog, 0);
            return TRUE;
        }
        break;
    case WM_CLOSE:
        EndDialog(dialog, 0);
        return TRUE;
    }
    return FALSE;
}

int WINAPI WinMain(HINSTANCE instance, HINSTANCE previous, LPSTR command_line, int show_command)
{
    (void)previous;
    (void)command_line;
    (void)show_command;
    return DialogBoxParamW(instance, MAKEINTRESOURCEW(IDD_MAIN), NULL, main_dialog, 0) == -1 ? 1 : 0;
}
