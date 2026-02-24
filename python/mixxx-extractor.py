import ctypes

lib = ctypes.CDLL("./libmixxx_analyzer.so")

lib.analyze_file.argtypes = [
    ctypes.c_char_p,
    ctypes.POINTER(ctypes.c_double),
    ctypes.c_char_p,
    ctypes.c_int
]

bpm = ctypes.c_double()
key_buf = ctypes.create_string_buffer(16)

lib.analyze_file(b"/path/to/file.mp3", ctypes.byref(bpm), key_buf, 16)

print("BPM:", bpm.value)
print("Key:", key_buf.value.decode())
