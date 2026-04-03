import traceback

try:
    from main import model
    print('Model is:', model)
except Exception as e:
    print('Error importing main:')
    traceback.print_exc()
